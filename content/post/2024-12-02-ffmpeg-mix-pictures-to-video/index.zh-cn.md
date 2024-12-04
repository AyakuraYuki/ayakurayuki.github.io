+++
title = '利用FFMpeg把图片合成视频的小记'
description = '记录一下使用标准预编译的 FFMpeg 和自带的滤镜效果器，把多张图片和一条音频合成视频，添加转场和模糊背景等等的用例。'
date = 2024-12-02T15:53:00+08:00
slug = '2024-12-02-ffmpeg-mix-pictures-to-video'
categories = ['guide']
tags = ['media', 'ffmpeg']
+++

> 记录一下使用标准预编译的 FFMpeg 和自带的滤镜效果器，把多张图片和一条音频合成视频，添加转场和模糊背景等等的用例。

## 用例其一：有几张近似16:9的图片合成视频

### 首先是合成出视频

我们有4张图片，分别命名为 `1.jpg`、`2.jpg`、`3.jpg`、`4.jpg`，它们都是近似于 `16:9` 的分辨率的图片。
最开始我的目的是先生成出一个基本的视频，没有任何特效和音乐，这个阶段下我可以偷懒使用分离器来处理。

首先我准备了一个 `filelist.txt` 文件，这里声明了图片的播放顺序和单张图片的播放时长：

```text
file 1.jpg
duration 3
file 2.jpg
duration 3
file 3.jpg
duration 3
file 4.jpg
duration 3
```

然后利用下面这条命令来执行合并：

```shell
ffmpeg -y \
    -f concat -safe 0 -i filelist.txt \
    -vf "scale=w=480:h=720:force_original_aspect_ratio=decrease,pad=480:720:(ow-iw)/2:(oh-ih)/2" \
    -r 25 -c:v libx264 -pix_fmt yuv420p output.mp4
```

简单解释一下各个参数：

- `-y`：覆盖输出文件，不需要每次都手动确认是否覆盖
- `-f concat`：指定输入格式是 concat
- `-safe 0`：允许使用相对路径或不安全的路径（例如包括空格的路径）
- `-i filelist.txt`：使用描述文件 `filelist.txt` 作为输入
- `-r 25`：设置了输出视频每秒帧率是25fps
- `-pix_fmt yuv420p`：为了可以正确解析没有头部的像素格式，这里设置了使用 `yuv420p` 来确保最大兼容（这里的解释可能说的不正确）
- `-vf "scale:...,pad=..."`：对每张图片使用相同的滤镜处理，在上面的命令中，我将每张图片缩小到一个 480*720 分辨率的画布，并保证原图等比例缩小，缩小后保留黑边以填充画布
- `-c:v libx264`：指定使用 h264 视频编码器

### 接下来是加入转场

每张图之间没有转场会比较生硬，可以在切换每张图片的时候做一些转场动画。这里我采用 `xfade` 滤镜来做基础转场效果。

要使用高级的滤镜效果需要写比较复杂的滤镜表达式，这里我们首先是不能再继续使用分离器，否则会增加滤镜表达式的复杂度；
其次 -vf 不太好写稍微复杂的表达式，`ffmpeg` 建议我使用 `-filter_complex` 来处理表达式。

所以上面的命令可以改写成如下的命令：

```shell
ffmpeg -y \
    -loop 1 -t 3 -i 1.jpg \
    -loop 1 -t 5 -i 2.jpg \
    -loop 1 -t 5 -i 3.jpg \
    -loop 1 -t 3 -i 4.jpg \
    -filter_complex "\
    [0:v]scale=w=480:h=720:force_original_aspect_ratio=decrease,pad=480:720:(ow-iw)/2:(oh-ih)/2[v0];\
    [1:v]scale=w=480:h=720:force_original_aspect_ratio=decrease,pad=480:720:(ow-iw)/2:(oh-ih)/2[v1];\
    [2:v]scale=w=480:h=720:force_original_aspect_ratio=decrease,pad=480:720:(ow-iw)/2:(oh-ih)/2[v2];\
    [3:v]scale=w=480:h=720:force_original_aspect_ratio=decrease,pad=480:720:(ow-iw)/2:(oh-ih)/2[v3];\
    [v0][v1]xfade=transition=fade:duration=1:offset=2[o1];\
    [o1][v2]xfade=transition=dissolve:duration=1:offset=5[o2];\
    [o2][v3]xfade=transition=radial:duration=1:offset=8[final]" \
    -map "[final]" -r 25 -c:v libx264 -pix_fmt yuv420p output.mp4
```

这里在上面的命令的基础上，新增了几个内容，下面简单解释一下：

- `-filter_complex`：复杂的滤镜表达式参数
- `-map "[final]"`：滤镜表达式可以指定一些输入输出变量，这里用最终输出变量 `[final]` 作为编码输入
- `xfade`：滤镜工具，支持多种基础预设转场动画，由 `transition` 控制；`duration` 控制了前后转场所需的时间，`offset` 控制了从什么时候开始转场，单位都是 `秒`

因为开头不包含进场特效，结尾也不包含退场特效，中间的图片会因为转场损失时间，所以中间的图片的 `-t` 时间参数会比开头、结尾多一到两个转场延时秒数，
那么 `xfade` 的 `offset` 参数相应的会有一定的延后。

### 图片缩放后会有黑边，用原图高斯模糊作为背景

高斯模糊原图作为背景，这里涉及到图层叠加，所以需要在转换每一张图的时候做两件事情，
一是对原图进行部分裁切，缩放到画布大小后使用高斯模糊；
二是对原图等比例缩小后放在模糊背景的中间。

具体命令如下：

```shell
ffmpeg -y \
    -loop 1 -t 3 -i 1.jpg \
    -loop 1 -t 5 -i 2.jpg \
    -loop 1 -t 5 -i 3.jpg \
    -loop 1 -t 3 -i 4.jpg \
    -filter_complex "\
    [0:v]crop=(ih/16*9):ih,scale=480:720,gblur=10:3[bg0];\
    [1:v]crop=(ih/16*9):ih,scale=480:720,gblur=10:3[bg1];\
    [2:v]crop=(ih/16*9):ih,scale=480:720,gblur=10:3[bg2];\
    [3:v]crop=(ih/16*9):ih,scale=480:720,gblur=10:3[bg3];\
    [0:v]scale=480:-1:force_original_aspect_ratio=decrease[fv0];\
    [1:v]scale=480:-1:force_original_aspect_ratio=decrease[fv1];\
    [2:v]scale=480:-1:force_original_aspect_ratio=decrease[fv2];\
    [3:v]scale=480:-1:force_original_aspect_ratio=decrease[fv3];\
    [bg0][fv0]overlay=(W-w)/2:(H-h)/2[v0];\
    [bg1][fv1]overlay=(W-w)/2:(H-h)/2[v1];\
    [bg2][fv2]overlay=(W-w)/2:(H-h)/2[v2];\
    [bg3][fv3]overlay=(W-w)/2:(H-h)/2[v3];\
    [v0][v1]xfade=transition=fade:duration=1:offset=2[o1];\
    [o1][v2]xfade=transition=hblur:duration=1:offset=5[o2];\
    [o2][v3]xfade=transition=radial:duration=1:offset=8[final]" \
    -map "[final]" \
    -r 25 -c:v libx264 -pix_fmt yuv420p output.mp4
```

- `crop=(ih/16*9):ih`：裁切图片
- `gblur=10:3`：高斯模糊，第一个参数控制核的大小，较大的核能产生较明显的模糊；第二个参数是模糊强度，控制模糊的程度
- `overlay=...`：控制了图层叠加时，上层图层的位置

### 最后添加一个循环播放的音频

```shell
ffmpeg -y \
    -loop 1 -t 3 -i 1.jpg \
    -loop 1 -t 5 -i 2.jpg \
    -loop 1 -t 5 -i 3.jpg \
    -loop 1 -t 3 -i 4.jpg \
    -stream_loop -1 -i paimen.wav \
    -filter_complex "\
    [0:v]crop=(ih/16*9):ih,scale=480:720,gblur=10:3[bg0];\
    [1:v]crop=(ih/16*9):ih,scale=480:720,gblur=10:3[bg1];\
    [2:v]crop=(ih/16*9):ih,scale=480:720,gblur=10:3[bg2];\
    [3:v]crop=(ih/16*9):ih,scale=480:720,gblur=10:3[bg3];\
    [0:v]scale=480:-1:force_original_aspect_ratio=decrease[fv0];\
    [1:v]scale=480:-1:force_original_aspect_ratio=decrease[fv1];\
    [2:v]scale=480:-1:force_original_aspect_ratio=decrease[fv2];\
    [3:v]scale=480:-1:force_original_aspect_ratio=decrease[fv3];\
    [bg0][fv0]overlay=(W-w)/2:(H-h)/2[v0];\
    [bg1][fv1]overlay=(W-w)/2:(H-h)/2[v1];\
    [bg2][fv2]overlay=(W-w)/2:(H-h)/2[v2];\
    [bg3][fv3]overlay=(W-w)/2:(H-h)/2[v3];\
    [v0][v1]xfade=transition=fade:duration=1:offset=2[o1];\
    [o1][v2]xfade=transition=hblur:duration=1:offset=5[o2];\
    [o2][v3]xfade=transition=radial:duration=1:offset=8[final]" \
    -map "[final]" \
    -map 4:a \
    -r 25 -c:v libx264 -c:a aac -pix_fmt yuv420p -shortest output.mp4
```

最后的命令不多，只是增加了一个音频的输入和输出。

- `-stream_loop -1`：放在音频输入的前面，声明这个音频可以无限循环播放
- `-map 4:a`：从第 5 个流选择音频轨道加入编码，因为流的编号从 0 开始，所以这里写作 `4:a`
- `-c:a aac`：指定了音频编码器
- `-shortest`：这个参数可以在视频和音频中找到最短的那个流，整体输出视频的时长由最短的流决定

## 用例其一：抽帧

> 这一小节主要参考了 [FFmpeg 抽帧指南 · Hanaasagi](https://blog.dreamfever.me/posts/2024-06-16-ffmpeg-extract-frames/#%E6%8A%BD%E5%8F%96%E5%85%B3%E9%94%AE%E5%B8%A7) 的文章内容，建议阅读原文。

视频抽帧有多种抽法，这里记录几个。

### 抽取首帧

```shell
ffmpeg -i input.mp4 -frames:v 1 -update 1 -y frame.png
```

- `-frames:v 1`：指定抽取一个视频帧
- `-update 1`：更新现有的输出文件，而不是新建文件

如果想要输出 jpg 图片，可以用：

```shell
ffmpeg -i input.mp4 -frames:v 1 -qscale:v 2 -update 1 -y frame.jpg
```

- `-qscale:v 2`：设置输出图像的质量参数。不同的编码器，参数不一样，以 mp4 来说，允许的范围是 `[1, 31]`，`1` 是最高质量，`31` 是最低质量，质量与文件大小正相关，质量越好文件越大，反之亦然。

### 抽取自定义区间

结合 `-ss` 或者任意可以选择时间段的参数，理论上都可以实现自定义区间抽帧。

```shell
ffmpeg -ss 00:00:30 -i input.mp4 -frames:v 1 -qscale:v 2 -update 1 -y frame.jpg
```

- `-ss 00:00:30`：指定从视频的 30 秒开始抽一帧

### 抽取尾帧

```shell
ffmpeg -sseof -1 -i input.mp4 -qscale:v 2 -update 1 -y frame.jpg
```

- `-sseof`：选择从视频末尾往前指定偏移时间处理，`sseof` 是 `start seek from end of file` 的缩写

### 过滤黑帧

过滤黑帧是使用过滤器实现的功能，一般用到 `blackframe` 和 `metadata` 过滤器来实现。

```shell
ffmpeg -ss 00:00:30 -i input.mp4 \
    -vf "blackframe=amount=0:threshold=32,metadata=select:key=lavfi.blackframe.pblack:value=50:function=less" \
    -qscale:v 2 -update 1 -y frame.jpg
```

- `blackframe`：这个过滤器输出检测到的帧的编号、黑色程度百分比，导出到元数据的 `lavfi.blackframe.pblack`，可以利用两个参数做筛选：
    - `amount`：必须低于阈值的像素的百分比，默认是 `98`，范围是 `[0, 100]`
    - `threshold`（别名 `thresh`）：被认为是黑色的像素值的阈值，默认是 `32`，范围是 `[0, 255]`
- `metadata`：这个过滤器可以按元数据摘取帧，这里读取 `lavfi.blackframe.pblack` 并挑选值小于 `50` 的数据

### 抽取关键帧

关键帧 `Keyframe` 是视频编码中的一种特殊帧，也称为I帧 `Intra-frame`。
在视频压缩中，视频帧通常分为三种类型：I帧、P帧 `Predicted frame` 和B帧 `Bi-directional predicted frame`。

- 关键帧（I帧）：关键帧是视频序列中的重要帧，它不依赖于其他帧来进行解码，而是独立编码的完整图像帧。在视频解码时，解码器可以通过解码一个关键帧来独立地显示该帧，无需任何其他帧的信息。因此，关键帧对于视频的快速随机访问非常重要，比如拖动进度条到任意时间点或者快速跳转到视频的某一部分。
- 预测帧（P帧）：预测帧依赖于前一个关键帧或预测帧进行解码，它只包含与前一帧之间的差异信息（运动向量、变化的像素等）。解码器需要先解码前一帧或预测帧，然后应用差异信息来生成预测帧的完整图像。
- 双向预测帧（B帧）：双向预测帧依赖于前后两个关键帧或预测帧进行解码，它包含了与前一帧和后一帧之间的差异信息。解码器需要先解码前一帧和后一帧，然后应用这些差异信息来生成双向预测帧的完整图像。

关键帧通常出现在视频的场景切换、运动剧烈变化或者时间间隔较长的位置，它们帮助视频解码器恢复完整图像并确保视频的质量和稳定性。视频编码器会根据一定的策略和算法自动选择关键帧的位置，以便在保证视频质量的同时尽可能地减小视频文件的大小。

关键帧的类型为 `I`，可以直接通过 `select` 进行提取：

```shell
ffmpeg -i input.mp4 -vf "select=eq(pict_type\,I)" -vsync vfr -f image2 ./frames/frame_%04d.png
```

对于 `P帧` 或者 `B帧`，只要把上面 `select` 表达式的 `I` 改成对应的类型即可：

- `P帧`: `P`
- `B帧`: `B`

### 均匀抽帧

每秒抽一帧？用 `-r` 参数实现。

```shell
ffmpeg -i input.mp4 -r 1 -f image2 ./frames/frame_%04d.png
```

- `-r 1`：每一秒取一次视频帧

### 转场抽帧

转场抽帧依靠 `select` 来检查场景变化，在帧间按照变化程度找出超过变化阈值的帧。

```shell
ffmpeg -i input.mp4 -vf "select='gt(scene,0.25)'" -vsync vfr -y ./frames/frame_%04d.png
```

- `select='gt(scene,0.25)'`：利用 `select` 过滤器，通过 `scene` 场景检测器计算帧与帧之间的差异，当差异超过 0.25 则认为场景发生了变化，则当作转场帧捕获导出

