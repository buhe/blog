---
title: '搭建环境 cuda12'
description: '搭建环境 cuda12'
pubDate: 'May 23 2024'
heroImage: '../../../../assets/i_38.jpg'
---

**CUDA**（**C**ompute **U**nified **D**evice **A**rchitecture，**统一计算架构**[\[1\]](https://zh.wikipedia.org/wiki/CUDA#cite_note-1)）是由英伟达[NVIDIA](https://zh.wikipedia.org/wiki/NVIDIA)所推出的一种[软](https://zh.wikipedia.org/wiki/%E8%BB%9F%E9%AB%94)[硬件](https://zh.wikipedia.org/wiki/%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%A1%AC%E4%BB%B6)集成技术，是该公司对于[GPGPU](https://zh.wikipedia.org/wiki/GPGPU)的正式名称。透过这个技术，用户可利用NVIDIA的[GPU](https://zh.wikipedia.org/wiki/GPU)进行[图像处理](https://zh.wikipedia.org/wiki/%E5%9B%BE%E5%83%8F%E5%A4%84%E7%90%86)之外的运算，亦是首次可以利用GPU作为C-编译器的开发环境。CUDA 开发包（CUDA Toolkit ）只能将自家的CUDA C-语言（对[OpenCL](https://zh.wikipedia.org/wiki/OpenCL)只有[链接](https://zh.wikipedia.org/wiki/%E9%93%BE%E6%8E%A5%E5%99%A8)的功能[\[2\]](https://zh.wikipedia.org/wiki/CUDA#cite_note-2)），也就是执行于GPU的部分编译成[PTX](https://zh.wikipedia.org/w/index.php?title=PTX&action=edit&redlink=1)[中间语言](https://zh.wikipedia.org/wiki/%E4%B8%AD%E9%96%93%E8%AA%9E%E8%A8%80)或是特定[NVIDIA](https://zh.wikipedia.org/wiki/%E8%8B%B1%E5%81%89%E9%81%94) GPU架构的[机器代码](https://zh.wikipedia.org/wiki/%E6%A9%9F%E5%99%A8%E7%A2%BC)（[NVIDIA](https://zh.wikipedia.org/wiki/NVIDIA) 官方称为 "device code"）；而执行于[中央处理器](https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%A4%AE%E5%A4%84%E7%90%86%E5%99%A8)部分的[C](https://zh.wikipedia.org/wiki/C%E8%AF%AD%E8%A8%80) / [C++](https://zh.wikipedia.org/wiki/C%2B%2B)代码（[NVIDIA](https://zh.wikipedia.org/wiki/NVIDIA) 官方称为 "host code"）仍依赖于外部的编译器。
### 安装 CUDA 12.2
### 安装 python 虚拟环境
python 其实是古老的语言，缺乏很多现代语言的特性，如 node.js 和 rust 的项目依赖隔离。默认所有项目的依赖装在一起，不同项目在依赖相同依赖的不同版本时很容易造成冲突。
python 虚拟环境很好的隔离了依赖。
### 创建 python 3.10 的虚拟环境
```bash
conda deactivate
# 退出 base 环境，防止虚拟环境中创建虚拟环境
conda create -n LLMs-from-scratch-zh python=3.10
conda activate LLMs-from-scratch-zh
```
### 下载为 cuda 编译好的 pytorch
现在 ML 默认都是以 pytorch 来简化，其他库也都构建在其上。
因为是 python3.10 和 cuda12.2 , OS 是 windows，所以选择 cu121/torch-2.1.0%2Bcu121-cp310-cp310-win_amd64.whl
***版本***
cu121/torch-2.1.0%2Bcu121-cp310-cp310-win_amd64.whl
### 安装 pytorch
```bash
pip install .\torch-2.1.0+cu121-cp310-cp310-win_amd64.whl
```
### 测试 pytorch 是否支持 gpu 加速
```bash
python
>>> import torch
# 很慢，毕竟 pytorch 有 2G
>>> print(torch.cuda.is_available())
True
```
