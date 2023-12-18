---
title: 简记Python里的单例化实现办法
date: 2019-08-01 10:00:00
slug: 2019-08-01-python-metaclass-singleton
categories:
    - guide
tags:
    - Python
    - design pattern
---

> 简单记录了我学到的 Python 单例的内容
>
> 本人一直都在用 Python3，以下的内容都基于 Python3 来记录，Python2 的这里就不放了

## 引入模块

模块在第一次导入时，会生成`pyc`文件，当第二次导入时，就会直接加载`pyc`文件，避免再次执行模块代码产生新的对象。

a.py

```python
class Singleton:
    def foo(self):
        pass


singleton = Singleton()
```

b.py

```python
from a import singleton
```

## 装饰器（我倒是喜欢理解成注解，谁叫我之前写 Java 的）

```python
def singleton(cls):
    __instances = {}

    def _singleton(*args, **kwargs):
        if cls not in __instances:
            __instances[cls] = cls(*args, **kwargs)
        return __instances[cls]

    return _singleton


@singleton
class A:
    a = 1

    def __init__(self, x=0):
        self.x = x


a1 = A(2)
a2 = A(3)
```

### 线程锁实现线程安全的单例

```python
import time
import threading
class Singleton:
    _instance_lock = threading.Lock()

    def __init__(self):
        time.sleep(1)

    @classmethod
    def instance(cls, *args, **kwargs):
        if not hasattr(Singleton, "_instance"):
            with Singleton._instance_lock:
                if not hasattr(Singleton, "_instance"):
                    Singleton._instance = Singleton(*args, **kwargs)
        return Singleton._instance
```

### `__new__`实现

`__new__`是 Python 生命周期中必经的步骤，即使我们没有显式声明`__new__`函数，解释器依旧帮我们执行了`object.__new__`。

所以我们可以将单例初始化的代码放入`__new__`函数中，让解释器来帮我们处理初始化的流程。

用`__new__`的方式实现单例是最方便的，并且同样可以实现线程安全的单例。

```python
import threading
class Singleton:
    _instance_lock = threading.Lock()

    def __init__(self):
        pass

    def __new__(cls, *args, **kwargs):
        if not hasattr(Singleton, "_instance"):
            with Singleton._instance_lock:
                if not hasattr(Singleton, "_instance"):
                    Singleton._instance = object.__new__(cls)
        return Singleton._instance
```

### `metaclass`元类

```python
class Singleton(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(Singleton, cls).__call__(*args, **kwargs)
        return cls._instances[cls]


class A(metaclass=constant.Singleton):
    pass
```
