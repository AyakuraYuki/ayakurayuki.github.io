---
title: 基于位的权限功能的设计
description: 利用位运算和权限覆写规则实现的多层权限配置功能
date: 2023-12-14 15:34:00
slug: 2023-12-14-permission-overwrite
categories:
    - infrastructure
tags:
    - permission
    - role
---

> 权限是一种用来赋予或限制用户使用功能的方式，它可以被配置到公会级别或者不同的身份上。另外，身份可以附加给用户，以此来组织化的赋予/限制用户在组织内的能力。

上述引言是我对 Discord 开发者文档库中对于 `Permissions` 的开篇描述的一个提炼。

---

这篇文章介绍了基于位 `bit` 的权限功能的设计，在这个设计中，主要包含了下面列出的要素：

1. 整个权限功能是在一个群体里流转的，不同的群体可以有不同的权限配置；
2. 权限功能的基础设施，在业务描述上可以称为群 `Guild`、频道 `Channel`、身份 `Role`（后文会围绕这三个名词来介绍功能的设计）；
3. 权限功能离不开用户，因为最终会被分配到用户 `Member` 身上；
4. 权限的集合应该由一系列原子属性来定义，每一位代表了一个独立的、可以原子化的功能，各属性之间不应该也不能出现歧义或重叠。

## 关于位

【位】是我们整个功能设计的核心，我们使用 `位运算` 来作为权限归集的运算基础。

权限的操作涉及到“授予”、“撤除”、“归集”、“检查”四种行为。

这四种行为映射到位上，可以描述为：

- 授予：将位上的某一个位设成 `1`
- 撤除：将位上的某一个位设成 `0`
- 归集：所有属性或权限值合并得到最终结果
- 检查：验证某一位上是 `0` 还是 `1`，表示这个属性是 `开` 还是 `关`

这里举个例子来表达一下其中一些行为。

```python
# 把权限 A（定为 0x40）和权限 B（定为 0x800）归集到一起
permissions = 0x40 | 0x800  # 0x840 -> 2112

# 分别检查权限 A 和 B
(permissions & 0x40) == 0x40  # True
(permissions & 0x800) == 0x800  # True

# 检查一个不存在的权限 C（定为 0x2）
(permissions & 0x2) == 0x2  # False

# 撤除权限 A
permissions = permissions & ~0x40
(permissions & 0x40) == 0x40  # False
```

我们从中可以看到，要实现上面说到的四种行为，我们需要使用位运算中的【或 `|`】、【与 `&`】、【取反 `~`】三种操作。

实际上，对于这些运算，我们可以不用写的很复杂。我们可以把权限转换成“位置”的思路，那么我们可以抽象出下面的一系列操作，来实现“授予”、“撤除”、“归集”、“检查”四种行为。

```go
// SetBit 打开/关闭某一个 position 上的属性
func SetBit(attr uint64, position int, flag bool) uint64 {
	if position <= 0 {
		return attr
	}
	if flag {
		// set to 1
		return attr | uint64(1)<<(position-1)
	} else {
		// set to 0
		return attr & ^(uint64(1) << (position - 1))
	}
}

// SetBits 批量的打开/关闭多个 positions 上的属性
func SetBits(attr uint64, positions []int, flag bool) uint64 {
	if len(positions) == 0 {
		return attr
	}
	for _, position := range positions {
		if position <= 0 {
			continue
		}
		attr = SetBit(attr, position, flag)
	}
	return attr
}

// GetBit 获取 attr 在 position 上的属性是开启的（1）还是关闭的（0）
func GetBit(attr uint64, position int) int {
	res := (attr >> (position - 1)) & 1
	return int(res)
}

// GetBitFlag 获取 attr 在 position 上的属性是开启的还是关闭的
func GetBitFlag(attr uint64, position int) bool {
	res := GetBit(attr, position)
	return res == 1
}

// Collect 归集一组权限值，得到最终权限值
func Collect(attrs []uint64) (attr uint64) {
	if len(attrs) == 0 {
		return 0
	}
	attr = 0
	for _, v := range attrs {
		attr |= v
	}
	return attr
}
```

## 属性

上面提到，

> 权限的集合应该由一系列原子属性来定义，每一位代表了一个独立的、可以原子化的功能

所以属性可以看成用来定义这些功能是不是可以提供给用户使用的开关。

比如我们可以声明一些这篇文章后文会用到的属性，具体见下表：

| 属性            | 位置 | 描述                         | 适用范围 |
|:--------------|:---|:---------------------------|:-----|
| Administrator | 1  | 允许所有的权限并且绕过权限覆写            | 群、身份 |
| ViewChannel   | 2  | 允许成员查看频道，包括阅读消息和查看语音频道基本信息 | 频道   |
| SendMessage   | 3  | 允许成员发送文本消息                 | 频道   |
| Connect       | 4  | 允许成员连接到频道语音                | 频道   |
| Speak         | 5  | 允许成员说话                     | 频道   |
| BanMembers    | 6  | 允许封禁成员                     | 群、身份 |

这是一个随意声明的属性表单，他不能概括一个业务的全部功能，仅仅只是举例。

表单里给出的位置，代表了这个属性在权限值的二进制序列中，从右到左数的第 x 个位置。

## 实体定义

有了运算方式和属性，接下来我们来围绕权限功能的基础设施，定义一些实体对象。

> 注意：所有下文定义的实体都不会提供完整的字段，只列出关键字段。

首先，权限是在一个群里流转的，我们就需要有描述一个群的对象，这里我们会定义一个 `Guild` 实体：

```go
type Guild struct {
	Permission string // 基础权限值（Hex 字符串）
	Attr       uint64 // 基础权限值（实值）

	OwnerID int64
}

func (g *Guild) IsOwner(member *Member) bool {
	if member == nil {
		return false
	}
	return g.OwnerID == member.UserID
}
```

`Guild` 提供了一个群的基本权限配置，它作用于所有在这个群里的成员，作为成员的默认权限配置。
在这个实体里，我们定义了字符串类型的 `Permission` 用来做持久化，另外定义了 `Attr` 作为数值运算的参数，`Attr` 是由 `Permission` 经过进制转换得到的无符号数值。
对于一些不支持无符号类型的语言，需要使用数值范围尽可能大的类型去承载。

---

接下来，我们定义一个群里会存在多个频道，因为不是所有的用户都喜欢聚集在一个很大的地方来交流，所以这个群里会存在多个附属的频道。
这里我们会定义一个 `Channel` 实体：

```go
type Channel struct {
	GuildID   int64  // 关联到某一个群的ID
	Allow     string // 这个频道默认开启的一些权限（Hex 字符串）
	AllowAttr uint64 // 这个频道默认开启的一些权限（实值）
	Deny      string // 这个频道默认禁止的一些权限（Hex 字符串）
	DenyAttr  uint64 // 这个频道默认禁止的一些权限（实值）

	Rules []*Overwrite
}
```

`Channel` 提供了频道的基本权限配置，由于 `Guild` 定义了基本的权限，在频道这一级别需要定义的就稍微有些不同。
要在频道里声明权限，因为已经有了基本权限，所以需要明确声明在基本权限之上，有哪些权限是开放的，又有哪些权限是需要禁止的。
所以这里我们声明了 `Allow` 和 `Deny` 分别描述要开放的权限和要禁止的权限。同理，我们另外定义包含 `-Attr` 后缀的属性，来作为数值运算的参数。
频道里定义的这些权限，同样是作为成员在频道里的默认权限配置，并且覆写群级别的基本权限。

---

再接下来，我们回到 `Guild`。群组里的成员一定会有一些身份，这些身份可能是区分管理员和普通人，可能是给一些头衔名号，也可能是一些 KickStarter 赞助奖励身份等等。
假如一个身份是用来授予给一些用户管理群组的能力，那么这个身份一定是声明了额外的权限，授权身份组内的成员使用更多的功能。
这里我们会定义一个 `Role` 实体：

```go
type Role struct {
	ID         int64
	GuildID    int64  // 关联到某一个群的ID
	Permission string // 基础权限值（Hex 字符串）
	Attr       uint64 // 基础权限值（实值）
}
```

因为身份不会声明禁止成员不能使用哪些功能，并且我们的这套权限功能使用了另外的方式去实现【禁止】的操作，所以 `Role` 实体只需要定义 `Permission` 来声明这个身份被授予了哪些权限。
同样的，我们额外定义了 `Attr` 来做数值运算的参数，后续也不再赘述。

---

目前为止，我们已经可以实现大多数的逻辑了：

1. 给群里的所有人分配基本权限
2. 这个群定义了多种多个频道，并且这些频道有自己的权限分配
3. 这个群定义了多个身份，这些身份也都配置了不同的权限
4. 这个群里有很多的成员，其中一部分成员持有各种不同的身份，其他的成员没有持有身份，作为普通成员活跃在这个群里他们能访问的各个频道

似乎还缺了一块最重要的拼图——访问规则

## 权限覆写

这个时候就要介绍整个功能比较核心的部分了，也是实现灵活自由的分配实际访问权限的核心——权限覆写。

权限覆写是一个可以在频道级别，为不同的角色或个人，配置具体的权限的一个功能。
它可以具体到例如限制只允许特定身份的用户访问频道、在频道里与他人互动，亦或者禁止普通人查看频道的内容等等。
又或者，它可以允许某几个特定的成员在频道里进行禁言他人、断开他人的语音连接、关闭他人的语音说话功能等等的管理操作。

首先我们定义一个 `Overwrite` 实体，它是一条一条的覆写规则：

```go
type Overwrite struct {
	ChannelID int64  // 关联到频道的ID
	Type      string // 规则适用的对象类型，它描述了这条规则应该适用于身份还是成员
	RelatedID int64  // 适用对象的ID，它由 Type 定义了关联的ID应该是身份ID还是成员的用户ID
	Allow     string // 这条规则默认开启的一些权限（Hex 字符串）
	AllowAttr uint64 // 这条规则默认开启的一些权限（实值）
	Deny      string // 这条规则默认禁止的一些权限（Hex 字符串）
	DenyAttr  uint64 // 这条规则默认禁止的一些权限（实值）
}
```

从这个结构来看，一条规则需要支持针对身份或者个人去生效，所以需要定义一个对生效目标的关联信息。另外，它于频道的权限定义类似，一条规则需要描述它所关联的对象能够做什么事情，以及不能够做什么事情。

现在我们已经有了 `Guild`、`Channel`、`Role`、`Overwrite`，能够定义权限的东西多了起来，并且在这个定义中还产生了例如 `Guild -> Member`、`Role -> Member` 等的多种联系。

这种情况下，我们应该定义一个怎样去应用覆写的【优先级】。所谓优先级，就是为了计算一个成员的最终权限值，我们需要遵守的一个计算顺序。我们需要遵循下列顺序的优先级来计算权限值：

1. 基于 `Guild` 获取对于所有人的基本权限
2. 应用在成员身上的多个身份所【授予】的权限
3. 频道里默认对于所有人所【禁止】的权限
4. 频道里默认对于所有人所【允许】的权限
5. 频道里默认对于特定【身份】所【禁止】的权限
6. 频道里默认对于特定【身份】所【允许】的权限
7. 频道里默认对于特定【成员】所【禁止】的权限
8. 频道里默认对于特定【成员】所【允许】的权限

遵循这套优先级，我们可以得到下面的伪代码去实现：

> 注意：在这套伪代码中的计算，可能不会存在太多 bitwise 调用，因为这套计算的大多数部分不属于设置单个属性的开关，而是做复杂的归集操作。
>
> 另外，伪代码里使用到的例如 `lo.KeyBy` 等方法，来自开源项目 [samber/lo](https://github.com/samber/lo)，感兴趣的可以查看原项目，我会在引用的地方写上注释说明干了什么事。

```go
type Member struct {
	UserID int64
	Roles  []*Role
}

// positions
const (
	Administrator = 1
	ViewChannel   = 2
	SendMessage   = 3
	Connect       = 4
	Speak         = 5
	BanMembers    = 6
)

var All = bitwise.SetBits(0, []int{Administrator, ViewChannel, SendMessage, Connect, Speak, BanMembers}, true)

// computeBasePermissions 计算基本权限
func computeBasePermissions(member *Member, guild *Guild) (permission uint64) {
	if guild.IsOwner(member) {
		return All
	}

	permission = guild.Attr
	if len(member.Roles) == 0 {
		return permission
	}

	for _, role := range member.Roles {
		permission |= role.Attr
	}

	if bitwise.GetBitFlag(permission, Administrator) {
		return All
	}

	return permission
}

// computeOverwrites 计算权限覆写
func computeOverwrites(basePermission uint64, member *Member, channel *Channel) (permission uint64) {
	if bitwise.GetBitFlag(basePermission, Administrator) {
		return All
	}

	permission = basePermission

	permission &= ^channel.DenyAttr
	permission |= channel.AllowAttr

	if len(channel.Rules) == 0 {
		return permission
	}

	// 把 channel.Rules 按照 Overwrite.Type 必须满足 role 的过滤条件，找出符合条件的 Overwrite 对象
	roleOverwrites := lo.FilterMap(channel.Rules, func(item *Overwrite, index int) (*Overwrite, bool) {
		return item, item.Type == "role"
	})
	// 把 channel.Rules 按照 Overwrite.Type 必须满足 member 的过滤条件，找出符合条件的 Overwrite 对象
	memberOverwrites := lo.FilterMap(channel.Rules, func(item *Overwrite, index int) (*Overwrite, bool) {
		return item, item.Type == "member"
	})

	// 把 roleOverwrites 切片按照 Overwrite.RelatedID 作为 key 转化成 map 结构
	roleOverwriteMap := lo.KeyBy(roleOverwrites, func(item *Overwrite) int64 { return item.RelatedID })

	allow := uint64(0)
	deny := uint64(0)
	if len(member.Roles) > 0 {
		for _, role := range member.Roles {
			role := role
			rule, exist := roleOverwriteMap[role.ID]
			if exist {
				allow |= rule.AllowAttr
				deny |= rule.DenyAttr
			}
		}
	}
	permission &= ^deny
	permission |= allow

	// 把 memberOverwrites 切片按照 Overwrite.RelatedID 作为 key 转化成 map 结构
	memberOverwriteMap := lo.KeyBy(memberOverwrites, func(item *Overwrite) int64 { return item.RelatedID })
	memberRule, exist := memberOverwriteMap[member.UserID]
	if exist {
		permission &= ^memberRule.DenyAttr
		permission |= memberRule.AllowAttr
	}

	return permission
}

// computePermissions 计算成员的权限值
func computePermissions(member *Member, channel *Channel, guild *Guild) (permission uint64) {
	basePermission := computeBasePermissions(member, guild)
	return computeOverwrites(basePermission, member, channel)
}
```

至此我们已经得到了一个完整的权限功能所需要的所有要素，经过 `computePermissions` 计算得到的结果，就是某个成员在一个群里的其中一个频道的最终权限；经过 `computeBasePermissions` 计算得到的结果，就是某个成员在频道之外，在群里的基本权限。

在做业务权限检查的时候，我们就可以按需调用这两个方法，在得到结果后去判断具体的权限是授权的还是被禁止的，从而实现我们做权限配置的需求。
