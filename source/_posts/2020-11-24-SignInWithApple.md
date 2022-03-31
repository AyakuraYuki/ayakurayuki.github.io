---
title: Sign in with Apple? Back-end?
date: 2020-11-24 10:00:00
categories:
    - guide
tags:
    - Apple
mp3:
cover:
---

## 引

一年前（注：本文撰写日期`2020-11-24`），Apple 对开发文档做了修改，自 iOS 13 之后，Apple 提供了一项名为`Sign in with Apple`的服务，旨在利用 Apple ID 服务，为第三方应用提供通过 iCloud 账号登录注册的入口。

然而，这项服务随之而来的改动是，任何接入第三方应用登录入口的 APP，必须接入`Sign in with Apple`服务，否则将会被拒绝上架到 App Store。

得知这个改动已经是撰写本文的时候了，其实我不知道该不该庆幸 App Store 审核人员没有因为我们没接这项服务而否掉我们的 APP，不过也是时候要把这个漏洞给补上了。

## 背景

也没啥背景，「一图流」走起：

![反正好狠的规定](/static/images/2020-11-24-SignInWithApple/01.jpeg)

## 怎么做

根据 Apple Developer Documentation 中对 [`Sign in with Apple`](https://developer.apple.com/documentation/sign_in_with_apple) 的说明，利用这项服务跟我们去接入微信服务号登录的流程是差不多的：

1. 向 Apple ID Server 申请登录，从那边获取一个叫`code`的东西。没错，这就是 OAuth 中的授权码，`Sign in with Apple`本质上还是一个 OAuth 授权认证的服务。
2. 那么我们都清楚了这是一个 OAuth 的授权码模式。APP 那边拿到了`code`之后，接着就是把这玩意儿扔给后端服务器，由后端服务器去通过`code`换取相应的用户信息。
3. 服务器换到用户信息，就可以继续完成后续的登录/注册的事情。

## 动手？

那么，说的那么简单，实际上对于后段服务器需要做的事情，网上的文档还是比较少的，绝大多数接入`Sign in with Apple`的教程都是客户端方案。当然，我们要的是一个思路，这些方案里或多或少都点到了一些。

实际施工的时候，后端需要关注的细节可以罗列为如下几点：

1. 从 Apple ID Server 获取公钥，取得的不是一个公钥，而是一组公钥，而这些公钥只是用来对`id_token`校验用的。这里提到的`id_token`会在后面解释。
2. 换取用户信息的操作，需要服务器走一次生成 JWT 的流程，这个流程依赖的一些参数可能不是你想象中的那么容易理解，因为`Sign in with Apple`提供给你的一些配置信息并不像其他的 OAuth 服务那样容易理解。
3. 苹果的这套服务有个好处，你可以本地调试。是的，本地调试，不一定需要提交到测试服务器，也不一定需要提交到生产环境，但是有可能本地调试通过了放到线上就会有一大批问题。（毕竟生产环境你永远都不知道会发生什么，对吧？）
4. 我上面第一条提到了`id_token`对吧，首先这个东西是一个"JWT"，那么你可以按照 JWT 的方式来对这个参数进行解析取值。但是，苹果在这个参数上用了一个叫 JWS 的概念，所以才会有第一条说到的"校验"。

## 好，可以动手了

首先我们需要一些来自苹果那边下发的"toolkit"，这些配置里包括`TeamID`、`KeyID`、`BundleID`，还有一个私钥文件。

服务端需要按照下面的流程来完成授权认证的操作：

1. 请求和验证用户，即换取用户信息
   a. 构造请求信息
   b. 生成一个叫`client_secret`的东西
2. 检查返回值的有效性
   a. 从 Apple ID Server 获取公钥组
   b. 反解析`id_token`并进行必要的 JWS 检查
   c. 检查有效性

### 请求和验证

构造请求信息需要携带的一些参数如下所示：

```curl
curl -v POST "https://appleid.apple.com/auth/token" \
     -H 'content-type: application/x-www-form-urlencoded' \
     -d 'client_id=CLIENT_ID' \
     -d 'client_secret=CLIENT_SECRET' \
     -d 'code=CODE' \
     -d 'grant_type=authorization_code' \
     -d 'redirect_uri=REDIRECT_URI'
```

[这里我贴出官方的接口文档，方便各位查看](https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens)

这些参数中，`client_id`、`client_secret`、`grant_type`是必须的，`redirect_uri`仅在需要网页登录时才携带，CS 模式不需要这个参数，`code`是从 APP 那里拿到的授权码。

这里的信息不像微信服务号接入的那样，是`AppID + AppSecret`的模式，而是`BundleID + JWS`的模式。也就是说，苹果并不会给你我们平常看到的一组字符串，而是需要把 APP 的 BundleID 当作这里的`client_id`的参数，然后自己去生成一个 JWS 丢给`client_secret`。

所以上面的 cURL，可以转换成下面的 cURL。这里我用的是 CS 模式，而不是 BS 模式，所以把`redirect_uri`去掉了。

```curl
curl -v POST "https://appleid.apple.com/auth/token" \
     -H 'content-type: application/x-www-form-urlencoded' \
     -d 'client_id=BUNDLE_ID' \
     -d 'client_secret=TOKEN' \
     -d 'code=CODE' \
     -d 'grant_type=authorization_code'
```

生成`client_secret`的话，这里我还是直接丢代码吧，代码里会有详细的说明：

```java
class AppConfig {
    String teamId;
    String keyId;
    String clientId;
    String keyPath;
}

class Service {
    // 读取私钥
    byte[] readKeyFile(AppConfig appConfig) {
        // 获取配置的私钥文件路径
        String keyPath = appConfig.keyPath;
        String base64;
        // 创建字符读取流
        try (
            InputStream is = getClass().classLoader.getResourceAsStream(keyPath);
            BufferedReader reader = new BufferedReader(new InputStreamReader(Objects.requireNonNull(is)))
        ) {
            // 这里我们只需要私钥文件中排除头部和尾部的中间部分，也就是私钥正文部分
            base64 = reader.lines().collect(Collectors.joining());
            base64 = base64.replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "");
        } catch (IOException e) {
            log.error("读取私钥失败：" + e.getLocalizedMessage(), e);
            return null;
        }
        // 最后获得私钥的bytes
        return Base64.decodeBase64(base64);
    }

    // 生成client_secret
    String generateClientSecret(AppConfig appConfig) {
        Map<String, Object> header = new HashMap<>();
        // 苹果规定加密的算法是ES256
        header.put("alg", "ES256");
        // 并且苹果下发给我们的toolkit里，用"KeyID"作为header.kid
        header.put("kid", appConfig.keyId);

        long iat = System.currentTimeMillis() / 1000;
        Map<String, Object> claims = new HashMap<>();
        // 苹果规定开发者生成JWS所用的issuer是TeamID
        claims.put("iss", appConfig.teamId);
        // iat和exp的参数是UNIX时间戳，秒级单位
        claims.put("iat", iat);
        // 这里的过期时间有限制，不能大于iat的六个月之后的时间
        claims.put("exp", iat + 3 * 30 * 24 * 60 * 60);
        // aud是一个固定参数，也是苹果规定的
        claims.put("aud", "https://appleid.apple.com");
        // subject则是开发者手上的APP的BundleID
        claims.put("sub", appConfig.clientId);

        try {
            PKCS8EncodedKeySpec pkcs8EncodedKeySpec = new PKCS8EncodedKeySpec(readAppleAuthPrivateKey(appConfig));
            KeyFactory keyFactory = KeyFactory.getInstance("EC");
            PrivateKey privateKey = keyFactory.generatePrivate(pkcs8EncodedKeySpec);
            return Jwts.builder()
                .setHeader(header)
                .setClaims(claims)
                .signWith(SignatureAlgorithm.ES256, privateKey)
                .compact();
        } catch (Exception e) {
            log.error("创建ClientSecret失败：" + e.getLocalizedMessage(), e);
            return null;
        }
    }
}
```

### 检查返回值的有效性

上面的请求如果没有错误，我们会获得 Apple ID Server 下发的 TokenResponse：

```json5
{
    access_token: "一个token，但是没什么用，因为苹果没有开其他的服务接口",
    token_type: "Bearer，固定值",
    expires_in: 3600,
    refresh_token: "一个用来刷新token的token",
    id_token: "identityToken，结果是JWT，这个是核心"
}
```

就像上面的 JSON 里写到的，`id_token`是我们整个流程的核心，它包括了必要的`sub`，也就是我们常说的微信开放平台 UnionID 的概念。

你可能会好奇为什么我提到了 UnionID。Apple ID Server 没有开放平台和公众平台的说法，理论上一个 Team 下的所有 APP 获取到的都是同一个 UserID，当然也有可能这个就是整个 Apple ID Server 给用户分配的全局 UserID，苹果用这样的 ID 统一了第三方登录的体系，你可以通过这个 UserID，在你的开发者账号下所有的 APP 中打通账户信息。

接下来，我们可以选择直接信任 Apple ID Server 返回给我们的数据，直接解析 `id_token` 的 payload 拿到`sub`，但是我还是建议走一遍公钥校验以验证回传数据的可靠性。

获取公钥很简单，苹果的公钥接口是开放的，不需要任何校验，任何人都可以调用，方法也很简单：

```curl
curl -G https://appleid.apple.com/auth/keys
```

这个接口会返回不止一个公钥，而是一组公钥列表，例如：

```json
{
    "keys": [
        {
            "kty": "RSA",
            "kid": "86D88Kf",
            "use": "sig",
            "alg": "RS256",
            "n": "iGaLqP6y-SJCCBq5Hv6pGDbG_SQ11MNjH7rWHcCFYz4hGwHC4lcSurTlV8u3avoVNM8jXevG1Iu1SY11qInqUvjJur--hghr1b56OPJu6H1iKulSxGjEIyDP6c5BdE1uwprYyr4IO9th8fOwCPygjLFrh44XEGbDIFeImwvBAGOhmMB2AD1n1KviyNsH0bEB7phQtiLk-ILjv1bORSRl8AK677-1T8isGfHKXGZ_ZGtStDe7Lu0Ihp8zoUt59kx2o9uWpROkzF56ypresiIl4WprClRCjz8x6cPZXU2qNWhu71TQvUFwvIvbkE1oYaJMb0jcOTmBRZA2QuYw-zHLwQ",
            "e": "AQAB"
        },
        {
            "kty": "RSA",
            "kid": "eXaunmL",
            "use": "sig",
            "alg": "RS256",
            "n": "4dGQ7bQK8LgILOdLsYzfZjkEAoQeVC_aqyc8GC6RX7dq_KvRAQAWPvkam8VQv4GK5T4ogklEKEvj5ISBamdDNq1n52TpxQwI2EqxSk7I9fKPKhRt4F8-2yETlYvye-2s6NeWJim0KBtOVrk0gWvEDgd6WOqJl_yt5WBISvILNyVg1qAAM8JeX6dRPosahRVDjA52G2X-Tip84wqwyRpUlq2ybzcLh3zyhCitBOebiRWDQfG26EH9lTlJhll-p_Dg8vAXxJLIJ4SNLcqgFeZe4OfHLgdzMvxXZJnPp_VgmkcpUdRotazKZumj6dBPcXI_XID4Z4Z3OM1KrZPJNdUhxw",
            "e": "AQAB"
        }
    ]
}
```

是不是有点意外，苹果并不想让你直接知道该用哪个公钥去检查返回值，而是需要通过`KeyID`获取正确的公钥来验证返回值。这个`KeyID`也很好拿，就在`id_token`的 header 里，反解析 JWT 就能拿到。下面我把我自己的代码贴一下：

```java
class Service {
    /**
     * 从Apple服务器获取验证Token签名的公钥（服务器缓存3600秒）
     */
    private JWKSet requestApplePublicKey() {
        // JWKSet，其结构如上面的 API 返回值
        JWKSet obj;
        String value = redis.get(KEY_APPLE_PUBLIC_KEY_LIST);
        if (StringUtils.isNotEmpty(value)) {
            // 服务器可以做一次短时缓存，从缓存读取公钥列表
            obj = JSON.parseObject(value, JWKSet.class);
        } else {
            // 第一次访问/缓存未命中，向 Apple ID Server 请求公钥组
            RestTemplate restTemplate = new RestTemplate();
            String content = restTemplate.getForObject(API_APPLE_AUTH_KEY, String.class);
            if (StringUtil.isEmpty(content)) {
                // 考虑到有可能会请求失败，这里我做了判空
                return null;
            }
            obj = JSON.parseObject(content, JWKSet.class);
            // 写入短时缓存
            redis.setex(KEY_APPLE_PUBLIC_KEY_LIST, content, 3600);
        }
        // 返回获取到的公钥对象
        return obj;
    }

    /**
     * 获取匹配identityToken.kid的公钥
     *
     * @param kid 从 id_token 解析出来的 KeyID
     */
    private PublicKey getApplePublicKey(String kid) {
        JWKSet jwkSet = requestApplePublicKey();
        if (jwkSet == null) {
          return null;
        }

        for (JWKSet.Keys key : jwkSet.getKeys()) {
            // 在这里，我们把从 id_token 反解到的 kid 拿来查询公钥，如果找到了，则通过关键的两个参数 n 和 e 构造公钥对象，这个公钥会被用来验证 id_token 的有效性。
            if (kid.equals(key.getKid())) {
                try {
                    String n = key.getN();
                    String e = key.getE();
                    BigInteger modulus = new BigInteger(1, Base64.decodeBase64(n));
                    BigInteger publicExponent = new BigInteger(1, Base64.decodeBase64(e));
                    RSAPublicKeySpec spec = new RSAPublicKeySpec(modulus, publicExponent);
                    KeyFactory kf = KeyFactory.getInstance("RSA");
                    return kf.generatePublic(spec);
                } catch (Exception e) {
                    log.error("解析获取公钥失败：" + e.getLocalizedMessage(), e);
                }
            }
        }

        return null;
    }

    /**
     * 检查identityToken是否合法
     */
    public boolean verifyAppleIdentityToken(String identityToken) {
        DecodedJWT jwt = JWT.decode(identityToken);
        String keyId = jwt.getKeyId();
        String audience = jwt.getAudience().get(0);
        String subject = jwt.getSubject();

        PublicKey publicKey = getApplePublicKey(keyId);
        JwtParser jwtParser = Jwts.parser().setSigningKey(publicKey);
        // 官方文档说明描述到，由 Apple ID Server 签发的 token 信息，其 iss 是固定值 https://appleid.apple.com
        jwtParser.requireIssuer("https://appleid.apple.com");
        // 这里检查 aud 是来自指定 App 发起的授权
        jwtParser.requireAudience(audience);
        // 这个检查一般来说会使用客户端传来的 user 做 sub 的检查依据，但我自己的实现就没考虑这么多了。
        // 建议在 APP 向后端服务器发起登录调用时，安全起见，除开 code 授权码之外，也把 user 传来，因为客户端收到的 user 一定是 Apple ID Server 回传的合法值。
        jwtParser.requireSubject(subject);

        try {
            Jws<Claims> jws = jwtParser.parseClaimsJws(identityToken);
            // 检查 JWS 里是否存在 auth_time ，理由嘛我不知道，但我看大多数文档里大家都是这么检查的 :(
            return jws != null && jws.getBody().containsKey("auth_time");
        } catch (Exception e) {
            log.error(e.getLocalizedMessage(), e);
            return false;
        }
    }
}
```

只要我们对`id_token`的检查通过，整个授权流程基本就算完成了，后端服务器就能正确获取到 user 信息，从而进行我们自己的第三方登录/注册流程。
