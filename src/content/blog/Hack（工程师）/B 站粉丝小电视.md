---
title: 'B 站粉丝小电视'
description: 'B 站粉丝小电视'
pubDate: 'May 08 2022'
heroImage: '../../../assets/i_37.jpg'
---

# 为什么要做
无意中看见有个 YouTube 的博主有一个可以监控粉丝数的小智能硬件，长成这样。
![](https://cdn.nlark.com/yuque/0/2022/jpeg/102615/1645842173248-211ee8df-7933-4d16-9e7e-1989cbf39cd3.jpeg)
我也想要一个，就自己做一个，优点有
- 可以自己定制
- 不为高溢价买单
下面以 监控 bilibili 的粉丝数为例，也可以监控微博、GitHub 等等，发挥你的想象吧。
# 选型
### esp32
[https://item.taobao.com/item.htm?spm=a1z09.2.0.0.3e362e8d7TBnZu&id=621962869215&_u=q2kut2h50e0](https://item.taobao.com/item.htm?spm=a1z09.2.0.0.3e362e8d7TBnZu&id=621962869215&_u=q2kut2h50e0)
esp32 有 Wi-Fi，而且很便宜。
### st7789
[https://item.taobao.com/item.htm?spm=a1z09.2.0.0.3e362e8d7TBnZu&id=661872665538&_u=q2kut2h511b](https://item.taobao.com/item.htm?spm=a1z09.2.0.0.3e362e8d7TBnZu&id=661872665538&_u=q2kut2h511b)
st7789 支持 spi 协议，可以和 esp32 配合使用，同样很便宜。
# 硬件连接
因为只要两个硬件，他们通过 spi 协议通信。
![](https://cdn.nlark.com/yuque/0/2022/png/102615/1645842528488-38ea41f3-d363-48ec-976e-cc67a5c9fc3e.png)
esp32 开发板的引脚图
#
![](https://cdn.nlark.com/yuque/0/2022/png/102615/1645842553151-8647b318-74c7-417d-becc-f432e917c2c3.png)
我买的 st7789 声称的
![](https://cdn.nlark.com/yuque/0/2022/png/102615/1645860940328-4b1e4b4f-6c1c-4b12-bc77-c19248913241.png)
实际，我拍摄的
按
- gnd-gnd
- vcc-3v3
- scl-gpio18
- sda-gpio19
- reset-gpio23
- ao-gpio16
- cs-gpio5
- bl-gpio4
左边是 st7789 右边是 esp32 。
# 固件编程
### 安装 rust
因为 c 语言的抽象程度太低，所以使用了 rust 作为本次开发的编程语言。
首先安装 rust ，参考 [https://rustup.rs/](https://rustup.rs/)
### 编译 rust 工具链
因为 rust 使用 llvm 生成目标代码，llvm 目前尚不支持 Xtensa 指令集，需要自己编译 rust 的工具链，参考 [https://github.com/esp-rs/rust-build](https://github.com/esp-rs/rust-build) ，编译完 rust 的工具链，执行  `rustup show`  , 显示。
```plain text
Default host: x86_64-apple-darwin
rustup home:  /Users/buhe/.rustup

installed toolchains
--------------------

stable-x86_64-apple-darwin
nightly-2020-06-04-x86_64-apple-darwin
nightly-2020-06-27-x86_64-apple-darwin
nightly-2020-10-27-x86_64-apple-darwin
nightly-2020-11-27-x86_64-apple-darwin
nightly-2021-01-01-x86_64-apple-darwin
nightly-2021-01-30-x86_64-apple-darwin
nightly-2021-03-01-x86_64-apple-darwin
nightly-2021-03-18-x86_64-apple-darwin
nightly-2021-03-24-x86_64-apple-darwin
nightly-2021-04-25-x86_64-apple-darwin
nightly-2021-08-25-x86_64-apple-darwin
nightly-2021-10-10-x86_64-apple-darwin
nightly-2021-11-01-x86_64-apple-darwin
nightly-2021-11-10-x86_64-apple-darwin
nightly-2022-01-13-x86_64-apple-darwin (default)
nightly-x86_64-apple-darwin
esp
```
如果成功，其中有个 esp 的工具链。
### 编程细节
```plain text
loop {
    // println!("...start...");
    let mut client;
    let res = EspHttpClient::new_default();
    match res {
        Ok(c) => client = c,
        Err(_) => continue,
    }
    let mut res = vec![];
    // res.push(github::init(&mut client)?);
    res.push(bilibili::init(&mut client)?);

    for p in  res {
        println!("{:?}", &p);
        AnyError::<st7789::Error<_>>::wrap(|| { draw_profile(&mut display, &p) })?;
    }
    drop(client);
    // drop(wifi);
    i = i + 1;
    println!("...{}...", i);

    // println!("...end...");
    thread::sleep(Duration::from_millis(20000));
    }
```
首先建立 http client ，访问 bilibili 的 API 获取昵称、粉丝数、关注数等。
显示这些信息在显示屏上。
```plain text
fn draw_profile<D>(display: &mut D, p: &Profile) -> Result<(), D::Error>
where
    D: DrawTarget<Color = Rgb565> + Dimensions,
    D::Color: From<Rgb565>,
{
    display.clear(Rgb565::BLACK.into())?;
    let data =  include_bytes!("../images/tv.raw");
    // println!("data : {:?}", data);
    let raw_image = ImageRawLE::<Rgb565>::new(data, 64);
    Image::new(
        &raw_image,
        Point::new(16, (display.bounding_box().size.height - 32) as i32 / 2))
    .draw(display)?;

    Text::new(
        format!("nick name: {}\nfolloers: {}\nfollowing: {}" ,&p.display ,&p.followers, &p.followings).as_str(),
        Point::new(100, (display.bounding_box().size.height - 10) as i32 / 2),
        MonoTextStyle::new(&FONT_10X20, Rgb565::WHITE.into()),
    )
    .draw(display)?;

    println!("LED rendering profile done");

    Ok(())
}
```
因为 bilibili 的 logo 是个可爱的小电视，就在显示屏上显示了一个小电视的图片，是 raw 格式的。图片是随便 Google 了一个 png ，通过 ffmpeg 转换成 raw 格式的
先安装 ffmpeg，再执行转换命令，mac环境下执行如下：
```plain text
brew install ffmpeg
ffmpeg -vcodec png -i tv.png -vcodec rawvideo -f rawvideo -pix_fmt rgb565 tv.raw
```
API 获取到的信息是 json 格式的，通过 serde 解析并写入 profile 对象。
### 编译
### 使用 esp 的工具链
根目录的 rust-toolchain.toml 使用 esp 作为工具链。
.cargo/config.toml 里的 target = "xtensa-esp32-espidf" 指定 xtensa 为指令集。
浏览器登录 bilibili 访问 [http://api.bilibili.com/x/space/myinfo](http://api.bilibili.com/x/space/myinfo) 获取 mid ，这个 mid 是你的用户 id。
执行
```plain text
export SSID="You wifi name"
export PASS="You wifi password"
export MID="You bilibili mid"
```
指定 Wi-Fi 名和密码，还有 mid。
执行
```plain text
cargo build --release
```
编译。。
### 烧录
安装烧录器
```plain text
pip install esptool
```
执行
```plain text
esptool.py --chip esp32 elf2image target/xtensa-esp32-espidf/release/up
esptool.py --chip esp32 -p /dev/cu.usbserial-0001 -b 460800 --before=default_reset --after=hard_reset write_flash --flash_mode dio --flash_freq 40m --flash_size detect 0x10000 target/xtensa-esp32-espidf/release/up.bin
```
第一个命令是把编译生成的 elf 文件转换成待烧录的镜像，
第二个命令是烧录镜像到 esp32，-p  是串口的端口，linux 和 mac 执行 `ls /dev/`能看到，windows 在“设备管理器”中看、以 com 开头。第二个命令有一定几率失败，如果失败就多执行几次。
源代码：[https://github.com/buhe/up](https://github.com/buhe/up)
# 3D 打印
编程结束，是这样的。
![](https://cdn.nlark.com/yuque/0/2022/png/102615/1645861017464-c057400f-4959-4b14-b4ad-bd2092610434.png)
离成品还缺个壳，3D 打印一个壳。使用 [https://www.tinkercad.com/](https://www.tinkercad.com/) 可以很容易编辑一个 stl 文件，把 stl 文件交给淘宝上的 3D 打印供应商，接着就是等他打印完，快递。。最终效果如下。
![](https://cdn.nlark.com/yuque/0/2022/jpeg/102615/1645843672977-682c3058-1375-4a7b-aad6-205ce42d21b2.jpeg)
