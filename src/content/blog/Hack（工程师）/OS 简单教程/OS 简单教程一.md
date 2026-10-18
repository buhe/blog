---
title: 'OS 简单教程一'
description: 'OS 简单教程一'
pubDate: 'Mar 19 2024'
heroImage: '../../../../assets/i_11.jpg'
---

### **操作系统的主要功能：**
- 准备运行环境，例如栈
- 虚拟化 CPU：切换任务
- 虚拟化内存：地址空间抽象
- 在硬件和软件之间搭建桥梁，例如：文件系统、屏幕驱动等
### **学习操作系统有什么好处**
- 可以更好的了解计算机的技术，知其所以然。如异步 IO ，在了解了操作系统之后就可以知道为什么快了。
- 在面试的时候可以回答的更深入。如考官再问从用户点击网址到浏览器渲染都经历什么？结合操作系统知识就可以回答的更好。
### **软件**
- 为什么使用 rust
	- 因为 rust 是现代语言，有包管理器、cli 等
	- 生态丰富，锐意进取
	- 内存安全
### **硬件**
- 我们使用 k210 来实验，我买的这个 https://world.taobao.com/item/598263769069.htm k210 maix bit ，目前没有屏幕和 wifi ,因为现在还用不上，以后会加上的。
- 因为开始几个文章输出都很快，切记！！！要按一下右边的按钮 restart 一下
![](https://mmbiz.qpic.cn/mmbiz_jpg/35hmbg3BDHInbVQEVGyS7tk4onbkaaGOHjf6qTdFsnLX7EhpbLjzjcOfs8iajYibx8ic09cLiaEQtNdsvm3PEvBicFQ/640?wx_fmt=jpeg&tp=wxpic&wxfrom=5&wx_lazy=1&wx_co=1)
好了，我们开始吧。项目地址是 https://github.com/buhe/bugu
### **工程**
因为要用的很多 #!\[feature()\] ，属于 unstable rust 所以要用 nightly 的 rust ，在根目录建立 rust-toolchain 内容是 nightly-2021-08-25 锁定 rust nightly 版本。
首先创建工程
```plain text
cargo new os
```
这是内核工程。
```plain text
cargo new user
```
这是应用程序工程。
