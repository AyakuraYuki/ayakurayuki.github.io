+++
title = 'Golang 绘制圆角遮罩'
description = '使用 fogleman/gg 图像处理库绘制圆角边框遮罩的两种方法'
date = 2024-11-11T11:37:45+08:00
slug = '2024-11-11-go-draw-rounded-rectangle'
categories = ['guide']
tags = ['golang', 'image']
+++

> 本文使用的 `fogleman/gg` 版本号是 `v1.2.1`

使用 `fogleman/gg` 图像处理库绘制圆角边框遮罩，有两种方法，一种是使用 `DrawRoundedRectangle` 方法绘制，另一种是路径处理法绘制。

## DrawRoundedRectangle

使用 `DrawRoundedRectangle` 方法，根据方法参数，我们需要知道原始图像的宽高，以及计算出所需圆角的半径，再给出绘制开始的坐标。

```go
package main

import (
	"github.com/fogleman/gg"
)

func main() {
	img, err := gg.LoadImage("/path/to/source_image.jpg")
	if err != nil {
		panic(err)
	}

	// 创建一个带透明背景的 gg 画布
	dc := gg.NewContext(width, height)
	// 设置背景为完全透明
	dc.SetRGBA(0, 0, 0, 0)
	dc.Clear()

	// 设置圆角边框
	dc.DrawRoundedRectangle(0, 0, float64(width), float64(height), float64(cornerRadius))
	dc.Clip()
	// 绘入原始图像
	dc.DrawImage(img, 0, 0)

	dc.SavePNG("/path/to/output.png")
}

```

## 路径处理法

路径处理法，顾名思义就是通过路径标记建立遮罩区域，形成封闭区域后填充遮罩，最后再绘制图像的方法。
所谓路径标记，其实就是按照给定的图像，进行类似我们在 Photoshop 使用钢笔工具建立选区的流程。

```go
package main

import (
	"github.com/fogleman/gg"
)

func main() {
	img, err := gg.LoadImage("/path/to/source_image.jpg")
	if err != nil {
		panic(err)
	}

	width := img.Bounds().Dx()
	height := img.Bounds().Dy()
	cornerRadius := width / 8

	// 创建一个带透明背景的 gg 画布
	dc := gg.NewContext(width, height)
	// 设置背景为完全透明
	dc.SetRGBA(0, 0, 0, 0)
	dc.Clear()

	// 设置圆角矩形遮罩区域
	dc.MoveTo(float64(cornerRadius), 0)
	dc.LineTo(float64(width-cornerRadius), 0)
	dc.QuadraticTo(float64(width), 0, float64(width), float64(cornerRadius))
	dc.LineTo(float64(width), float64(height-cornerRadius))
	dc.QuadraticTo(float64(width), float64(height), float64(width-cornerRadius), float64(height))
	dc.LineTo(float64(cornerRadius), float64(height))
	dc.QuadraticTo(0, float64(height), 0, float64(height-cornerRadius))
	dc.LineTo(0, float64(cornerRadius))
	dc.QuadraticTo(0, 0, float64(cornerRadius), 0)
	dc.ClosePath()

	// 填充遮罩为白色
	dc.FillPreserve()
	// 将圆角区域作为绘制区域
	dc.Clip()
	// 在圆角遮罩上绘制图像
	dc.DrawImageAnchored(img, width/2, height/2, 0.5, 0.5)

	dc.SavePNG("/path/to/output.png")
}

```
