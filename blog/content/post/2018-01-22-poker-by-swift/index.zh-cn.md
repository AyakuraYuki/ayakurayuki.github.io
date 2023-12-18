---
title: Create a full deck of cards in Swift
date: 2018-01-22 10:00:00
slug: 2018-01-22-poker-by-swift
categories:
    - guide
tags:
    - Swift
---

> 使用 Swift Playground 创建的一个程序，可以创建一套含 52 张的扑克牌，并按照花色和牌号排序。

最近开始学习 Swift 编程，学到枚举和结构体，看到最后一个 Experiment 要实现创建一套扑克，结合了一下以前写过的"双条件"排序和官方 GuidedTour，弄了下面的代码实现。

```swift
// Base card rank
enum Rank: Int {
    case ace = 1
    case two, three, four, five, six, seven, eight, nine, ten
    case jack, queen, king
    func simpleDescription() -> String {
        switch self {
        case .ace:
            return "ace"
        case .jack:
            return "jack"
        case .queen:
            return "queen"
        case .king:
            return "king"
        default:
            return String(self.rawValue)
        }
    }
    func equals(compare: Rank) -> Bool {
        return self.rawValue == compare.rawValue
    }
}

// Card suit
enum Suit {
    case spades, hearts, diamonds, clubs

    func simpleDescription() -> String {
        switch self {
        case .spades:
            return "spades"
        case .hearts:
            return "hearts"
        case .diamonds:
            return "diamonds"
        case .clubs:
            return "clubs"
        }
    }

    func color() -> String {
        switch self {
        case .hearts, .diamonds:
            return "red"
        case .spades, .clubs:
            return "black"
        }
    }
}

// Poker struct with rank and suit.
struct Poker {
    var rank: Rank
    var suit: Suit
    func description() -> String {
        return "This card is a \(suit.color()) \(suit.simpleDescription()) \(rank.simpleDescription())."
    }
}

var poker = [Poker]()
// Add cards
for i in 1...13 {
    poker.append(Poker(rank: Rank(rawValue: i)!, suit: Suit.spades))
    poker.append(Poker(rank: Rank(rawValue: i)!, suit: Suit.hearts))
    poker.append(Poker(rank: Rank(rawValue: i)!, suit: Suit.diamonds))
    poker.append(Poker(rank: Rank(rawValue: i)!, suit: Suit.clubs))
}
// Order by suit, then rank
poker.sort(by: {l, r -> Bool in
    if l.suit.simpleDescription() < r.suit.simpleDescription() {
        return false
    } else if l.suit.simpleDescription().elementsEqual(r.suit.simpleDescription()) {
        return l.rank.rawValue < r.rank.rawValue
    } else {
        return true
    }
})
// Display
poker.forEach { (item) in
    print(item.description())
}
```
