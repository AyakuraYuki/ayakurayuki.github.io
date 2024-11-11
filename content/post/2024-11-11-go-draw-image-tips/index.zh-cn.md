+++
title = 'Golang 绘制图片小技巧合集'
description = '使用 fogleman/gg 和 disintegration/imaging 图像处理库绘制图片的一些小技巧'
date = 2024-11-11T16:40:30+08:00
slug = '2024-11-11-go-draw-image-tips'
categories = ['guide']
tags = ['golang', 'image']
+++

使用 `fogleman/gg` 和 `disintegration/imaging` 图像处理库绘制图片的一些小技巧，这些技巧中的大多数都可以组合使用，
有一些方法比较类似 Photoshop 的图层操作，有一些又类似蒙版，可以考虑实操看效果。

## 缩小并旋转图片

缩小并旋转图片，是使用 `disintegration/imaging` 处理库，组合了 `Resize` 和 `Rotate` 方法，并利用这个处理库的抗锯齿支持，实现较为美观的缩放旋转处理。

要实现缩放旋转，需要定义几个参数：

- angle - 转动角度
- zoomWidth/zoomHeight - 缩放宽度或者高度，任意一个值是 0 表示在这个方向上等比缩放

对于抗锯齿，我们统一使用 `Lanczos` 算法，在 `imaging` 中是 `imaging.Lanczos` 重采样过滤器，可以实现最佳效果的抗锯齿渲染。

```go
package demo

import (
	"github.com/disintegration/imaging"
	"image"
)

func rotateImage(img image.Image, zoomWidth, zoomHeight int, angle float64) image.Image {
	resizedImg := imaging.Resize(img, zoomWidth, zoomHeight, imaging.Lanczos)
	rotatedImg := imaging.Rotate(resizedImg, angle, image.Transparent)
	return rotatedImg
}

```

## 给图片增加圆角遮罩

在前一篇文章 [Golang 绘制圆角遮罩]({{ < relref "content/post/2024-11-11-go-draw-rounded-rectangle/index.zh-cn.md" > }}) 中我们介绍了两种
用于绘制圆角遮罩的方法，我们采取其中一种比较简单易懂的来实现。

要实现圆角遮罩，需要定义几个参数：

- width - 原始图片宽度像素
- height - 原始图片高度像素
- cornerRadius - 圆角半径像素

具体步骤是：

1. 创建一个带透明背景的画布
2. 创建一个圆角矩形，并作为绘图区域
3. 把原始图像绘入绘图区域

```go
package demo

import (
	"github.com/fogleman/gg"
	"image"
)

func applyRoundedCorners(img image.Image, width, height, cornerRadius int) image.Image {
	dc := gg.NewContext(width, height) // 创建一个带透明背景的 gg 画布
	dc.SetRGBA(0, 0, 0, 0)             // 设置背景为完全透明
	dc.Clear()                         // 以当前颜色填满整个画布

	dc.DrawRoundedRectangle(0, 0, float64(width), float64(height), float64(cornerRadius))
	dc.Clip()
	dc.DrawImage(img, 0, 0)

	return dc.Image()
}
```

## 给图片加上外边框渐变阴影

使用 `fogleman/gg` 处理库，对原始图像加上外边框渐变阴影，可以理解为在原始图像的底层加上一个绘制了渐变淡出边框的图层，并非添加蒙版。

要实现这一效果，需要定义几个参数：

- borderWidth - 边框宽度像素
- cornerRadius - 渐变图层圆角半径像素，也可以不定义，由原图宽度计算获得

因为渐变是一层一层画出来的，所以这里的边框宽度像素其实是设置了我们要循环多少次来画多少个外边框，一层一层逐渐减小 alpha 通道值，直到 `alpha == 0.0`。

```go
package demo

import (
	"github.com/fogleman/gg"
	"image"
)

// cornerRadius 可以是 0，会利用 width 计算，默认取 float64(width/10) 的值
func applyShadow(img image.Image, borderWidth, cornerRadius int) image.Image {
	width, height := img.Bounds().Dx(), img.Bounds().Dy()
	shadowWidth := width + 2*borderWidth
	shadowHeight := height + 2*borderWidth

	radius := float64(cornerRadius)
	if cornerRadius <= 0 {
		radius = float64(width / 10)
	}

	dc := gg.NewContext(shadowWidth, shadowHeight) // 创建一个新的 gg 画布
	dc.SetRGBA(0, 0, 0, 0)                         // 透明背景
	dc.Clear()                                     // 将整个画布填充为透明的

	// 绘制渐变边框
	for i := 0; i < borderWidth; i++ {
		alpha := 0.2 * (1 - float64(i)/float64(borderWidth)) // 从0.2渐变到0
		dc.SetRGBA(0, 0, 0, alpha)                           // 黑色渐变
		dc.DrawRoundedRectangle(float64(borderWidth-i), float64(borderWidth-i), float64(width+2*i), float64(height+2*i), radius)
		dc.Stroke()
	}

	dc.DrawImageAnchored(img, shadowWidth/2, shadowHeight/2, 0.5, 0.5)
	return dc.Image()
}

```

---

## 进阶

### 对一张图改圆角，加阴影，再旋转

```go
package demo

import (
	"github.com/disintegration/imaging"
	"github.com/fogleman/gg"
	"log"
)

func main() {
	img, err := gg.LoadImage(`/path/to/raw_image.jpg`)
	if err != nil {
		log.Fatal(err)
	}

	width, height := img.Bounds().Dx(), img.Bounds().Dy()

	// 加圆角
	img = applyRoundedCorners(img, width, height, width/10)

	// 等比缩放
	img = imaging.Resize(img, 0, 200, imaging.Lanczos)

	// 加阴影
	img = applyShadow(img, 3, 0) // 这里让方法内部自己计算

	// 旋转图片
	img = imaging.Rotate(img, 45, image.Transparent) // 这里让图片顺时针转 45 度

	dc := gg.NewContext(500, 500)
	dc.SetRGBA(0, 0, 0, 0)
	dc.Clear() // 用当前透明色填满画布
	dc.DrawImageAnchored(img, 250, 250, 0.5, 0.5)
	dc.SavePNG(`/path/to/output.png`)
}

func applyRoundedCorners(img image.Image, width, height, cornerRadius int) (ret image.Image) { /* 去看上面的代码 */ return }

func applyShadow(img image.Image, borderWidth, cornerRadius int) (ret image.Image) { /* 去看上面的代码 */ return }

```
