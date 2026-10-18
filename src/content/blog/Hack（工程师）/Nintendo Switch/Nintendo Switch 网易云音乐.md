---
title: 'Nintendo Switch 网易云音乐'
description: 'Nintendo Switch 网易云音乐'
pubDate: 'May 20 2022'
heroImage: '../../../../assets/i_19.jpg'
---

# 为什么要做
小米音响和腾讯音乐合作，而我平时主要用网易云来听歌，看看吃灰的 ns 萌生了一个想法：给 ns 开发一个自制软件，用来播放网易云的歌。
# 越狱 ns
想给 ns 安装自制软件必须先越狱，参考 [NH Switch Guide (nh-server.github.io)](https://nh-server.github.io/switch-guide/) ，得益于某宝、我买了一个“阻断器”，越狱很简单，按教程一步步来就行。推荐在 windows 环境下，因为工具是可视化的而且似乎比较稳定，笔者是~~双系统的~~两台电脑，在 Windows 环境下越狱，在 Mac 环境下开发的。
### 安装工具链
越狱完 ns ，安装开发工具链，其实就是交叉编译到 arm 的 gcc 和一些库。感谢越狱团队提供这么好用、稳定的工具链。安装：
- 先安装 pacman ，安装包地址在 [https://github.com/devkitPro/pacman/releases/tag/v1.0.2](https://github.com/devkitPro/pacman/releases/tag/v1.0.2)
- 运行
```plain text
sudo dkp-pacman -S switch-dev

sudo dkp-pacman -S switch-curl

sudo dkp-pacman -S devkitA64 switch-tools switch-curl switch-bzip2 switch-freetype switch-libjpeg-turbo switch-sdl2 switch-sdl2_gfx switch-sdl2_image switch-sdl2_ttf switch-zlib switch-libpng

sudo dkp-pacman -S switch-libjson-c
```
安装工具链和库。安装完就能编译项目了。
# 技术细节
### c vs rust
第一想法是用 rust 来开发，毕竟 rust 表达能力更强，代码复用性更好，还有编译器帮忙管理内存。直到我看到 [https://github.com/aarch64-switch-rs/examples/issues/6](https://github.com/aarch64-switch-rs/examples/issues/6) ，rust lib 还不支持网络，而本项目需要网络支持，从侧面看出这个库还不够成熟，于是在经过一番权衡之后选择了 c ，比较如下。
- c lib
	- [https://github.com/switchbrew/libnx](https://github.com/switchbrew/libnx)
- rust lib
	- [https://github.com/aarch64-switch-rs/cargo-nx](https://github.com/aarch64-switch-rs/cargo-nx)
	- [https://github.com/aarch64-switch-rs/nx](https://github.com/aarch64-switch-rs/nx)
### c 编译、链接
这个项目需要 curl, json-c, sdl 等等，把他们编译、链接进来。修改 Makefile 的 CFLAGS 和 LIBS
```plain text
CFLAGS	:=	-g -Wall -O2 -ffunction-sections \
$(ARCH) $(DEFINES) `curl-config --cflags` `$(PREFIX)pkg-config --cflags sdl2 SDL2_image SDL2_mixer`

LIBS	:= `$(PREFIX)pkg-config --libs sdl2 SDL2_image SDL2_ttf SDL2_mixer` `curl-config --libs` -lmpg123 -lpng -ljpeg -lnx -ljson-c
```
编译 sdl 还需要一直使用 c++ 的链接器
```plain text
export LD	:=	$(CXX)
```
这样就可以成功编译、链接，带 curl, json-c, sdl 的项目了。
### 远程
开发自制软件频繁插入、拔出 sd 卡，不仅效率低下而且很容易产生挫败感，在开始开发前先要把开发环境搞好，还是感谢越狱团队提供了 NetLoad 和远程打印。
### 安装 app
通过网络安装 app ，叫做 NetLoad ，在 Makefile 中添加一个 load 任务，-s 表示建立一个服务器接收消息，远程打印会用到。-a \{ip\} 提供 ns 的 ip 地址，./switch_netease_cloud.nro 是自制软件编译完打包的产物。执行 make load 完成远程安装 app 的操作。
```plain text
load: all
	nxlink -s -a 192.168.31.64 ./switch_netease_cloud.nro
```
### 远程打印
当使用 sdl 制作 UI 后，看不见 printf 的打印语句，远程打印通过网络，printf 的执行结果传输到执行 make 的终端，方便调试。
```plain text
socketInitializeDefault();
nxlinkStdio();

...

socketExit();
```
socketInitializeDefault(); nxlinkStdio(); 之后到 socketExit(); 之前。所有的 printf 函数调用都会远程打印到执行 make 的终端。
### curl
要使用网络就要使用 curl 库，下面来谈谈用到的 curl 特性。目标是下载歌曲然后播放，首先来下载歌曲，下载歌曲要获取歌曲的 url ，获取歌曲的 url 需要登录，登录选择扫描二维码方式，通过访问 https://base/login/qr/create?qrimg=true&key=xxx 来获取二维码的 base64 ，解码后渲染图片。扫码之后，访问 https://base/login/qr/check?key=xxx ，如果扫码成功，会在返回值 set-cookie 设置 cookie ，之后的访问就是登录的了。
### cookie
因为 http 是无状态的，默认前后访问之间不共享 cookie，要想共享就要让后面的访问读取前面的 cookie 。
下面的代码用 W_COOKIE 覆盖 R_COOKIE，然后删除 W_COOKIE ，就是用这次返回的 cookie 在下次访问的时候带上，这样登录之后的 cookie 就能在以后的访问都带上了。
```plain text
rename(W_COOKIE, R_COOKIE);
```
配置：从 CURLOPT_COOKIEFILE 读取 cookie ，cookie 写入 CURLOPT_COOKIEJAR 。
```plain text
curl_easy_setopt(curl, CURLOPT_COOKIEFILE, R_COOKIE);
curl_easy_setopt(curl, CURLOPT_COOKIEJAR, W_COOKIE);
```
### 下载文件
下载大文件需要更多的内存，因为 curl 默认先放在内存中，再复制到文件系统。下载 4m 左右的文件没问题，可下载 10m 左右的文件就崩溃了，要想使用更大的内存需要按住 R 键不放，随意点一个游戏，这时打开的不是这款游戏，而是 hbmenu ，也就是越狱后的管理器，再访问这个 app 就能访问全部内存了，下载大文件也不会崩溃了。
### 调试
curl 也能用来调试 http ，设置 CURLOPT_VERBOSE 为 1，就能开启调试，
```plain text
curl_easy_setopt(curl, CURLOPT_VERBOSE, 1l);
```
配合远程打印，调试能看到证书、url、cookie、请求、响应等等，非常方便。
```plain text
* Dumping cert info:
*  0 Subject: CN=*.vercel.app
*    Issuer: C=US, O=Let's Encrypt, CN=R3
*    Version: 3 (0x2)
*    Serial Number: 04:f7:9d:44:71:6f:d9:bc:bd:82:85:bc:25:fe:c5:c7:94:43:
*    Signature Algorithm: sha256WithRSAEncryption
*    Start Date: 2022-03-03 10:53:25 GMT
*    Expire Date: 2022-06-01 10:53:24 GMT
*    Public Key Algorithm: rsaEncryption
*    RSA Public Key (2048 bits)
*    rsa(n): 97:e5:f8:bc:76:43:54:12:4d:2e:b6:14:57:1a:0d:09:31:49:68:4c:6e:0c:eb:37:15:df:bf:f7:af:70:da:b1:5e:44:2a:39:be:29:94:be:f0:fa:db:ae:a4:f7:3f:2a:70:61:00:a2:16:71:c7:ba:fd:80:c6:5f:2a:52:e9:4a:65:62:0b:dd:ee:00:ff:07:1f:8e:21:30:cf:14:2f:03:f4:f7:67:ee:9f:f7:18:ff:fd:61:a0:00:31:f6:7a:f0:91:70:49:0a:37:66:02:d6:b4:ee:d8:c6:0e:c9:0e:fa:4c:d9:d3:fe:7c:c7:b5:be:2a:21:60:1e:84:75:85:4e:a9:a1:54:32:9c:57:5e:c6:33:58:c5:a3:ef:31:3c:8f:6c:68:aa:0c:50:cc:f0:d4:bb:2e:fd:b1:dd:ff:05:4b:77:71:54:65:a2:15:7c:63:cc:79:35:19:07:19:c2:31:73:a7:1f:aa:57:03:b3:b5:ca:60:09:14:6f:3c:e2:91:8b:0a:8e:ec:44:1e:fc:25:20:83:a8:c5:a6:fc:31:1d:a6:e4:9c:44:25:d4:8e:e5:80:11:ed:b7:d8:1b:83:bb:1c:1e:4c:9d:27:00:71:11:e1:45:64:45:01:18:82:da:16:f4:75:f7:57:da:f7:fd:a4:8b:09:77:4d:cf:86:73:
*    rsa(e): 0x10001
*    Signature: 83:10:a2:50:43:9b:8a:0a:1e:19:09:16:19:75:5d:c1:00:67:b3:b9:64:ad:b6:65:d9:3b:f5:f4:f4:4c:bb:5d:28:0f:fe:e8:10:b1:28:f2:df:89:f5:51:f0:84:8c:5d:e7:e9:61:36:e8:dc:d2:bf:e5:e0:1c:82:f9:7b:e7:39:a8:47:69:2d:e9:71:ba:d1:e1:e7:e5:fd:57:f0:c7:1d:e4:c8:ce:5a:4b:0c:15:86:b3:42:c2:64:de:b4:95:80:7a:b3:f4:dc:60:c1:cf:e3:69:d3:00:08:81:b2:df:0e:aa:16:1b:c5:62:48:60:6b:2b:55:73:06:45:ba:da:52:74:34:4e:29:f8:6e:93:c4:df:fe:a2:73:09:77:6a:65:32:34:b1:4f:74:54:f5:20:24:23:36:f9:4d:fd:f1:de:e1:f8:d5:17:08:a1:83:aa:82:55:e8:6c:fd:b4:e3:00:66:f2:b2:3b:97:95:f6:6e:cc:57:03:ab:9f:08:06:69:cf:57:4c:4b:39:7c:c5:ab:ea:c7:5e:3a:7d:ab:4c:e7:14:04:24:35:90:eb:32:3e:7f:86:57:a7:08:c4:eb:25:ab:a0:46:e0:f1:d2:5f:0a:0c:49:97:90:91:e7:ab:71:5a:c6:08:ad:df:3f:3e:37:f3:ad:40:33:ef:1e:27:1f:
* -----BEGIN CERTIFICATE-----
MIIFKjCCBBKgAwIBAgISBPedRHFv2by9goW8Jf7Fx5RDMA0GCSqGSIb3DQEBCwUA
MDIxCzAJBgNVBAYTAlVTMRYwFAYDVQQKEw1MZXQncyBFbmNyeXB0MQswCQYDVQQD
EwJSMzAeFw0yMjAzMDMxMDUzMjVaFw0yMjA2MDExMDUzMjRaMBcxFTATBgNVBAMM
DCoudmVyY2VsLmFwcDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAJfl
+Lx2Q1QSTS62FFcaDQkxSWhMbgzrNxXfv/evcNqxXkQqOb4plL7w+tuupPc/KnBh
AKIWcce6/YDGXypS6UplYgvd7gD/Bx+OITDPFC8D9Pdn7p/3GP/9YaAAMfZ68JFw
SQo3ZgLWtO7Yxg7JDvpM2dP+fMe1viohYB6EdYVOqaFUMpxXXsYzWMWj7zE8j2xo
qgxQzPDUuy79sd3/BUt3cVRlohV8Y8x5NRkHGcIxc6cfqlcDs7XKYAkUbzzikYsK
juxEHvwlIIOoxab8MR2m5JxEJdSO5YAR7bfYG4O7HB5MnScAcRHhRWRFARiC2hb0
dfdX2vf9pIsJd03PhnMCAwEAAaOCAlMwggJPMA4GA1UdDwEB/wQEAwIFoDAdBgNV
HSUEFjAUBggrBgEFBQcDAQYIKwYBBQUHAwIwDAYDVR0TAQH/BAIwADAdBgNVHQ4E
FgQUNRyXGSvg+ptj+H5PxwBTcd8vj4kwHwYDVR0jBBgwFoAUFC6zF7dYVsuuUAlA
5h+vnYsUwsYwVQYIKwYBBQUHAQEESTBHMCEGCCsGAQUFBzABhhVodHRwOi8vcjMu
by5sZW5jci5vcmcwIgYIKwYBBQUHMAKGFmh0dHA6Ly9yMy5pLmxlbmNyLm9yZy8w
IwYDVR0RBBwwGoIMKi52ZXJjZWwuYXBwggp2ZXJjZWwuYXBwMEwGA1UdIARFMEMw
CAYGZ4EMAQIBMDcGCysGAQQBgt8TAQEBMCgwJgYIKwYBBQUHAgEWGmh0dHA6Ly9j
cHMubGV0c2VuY3J5cHQub3JnMIIBBAYKKwYBBAHWeQIEAgSB9QSB8gDwAHcAb1N2
rDHwMRnYmQCkURX/dxUcEdkCwQApBo2yCJo32RMAAAF/T6CzawAABAMASDBGAiEA
0UagLP7lfQ8HBohsmSYw2Qg3mtVyYHRVt476tTQnSGwCIQCS5P+2/vUt5I25G36z
pYNhEDemofzHZr1gq5yvFv4DRgB1ACl5vvCeOTkh8FZzn2Old+W+V32cYAr4+U1d
JlwlXceEAAABf0+gtNoAAAQDAEYwRAIgRGQGCmiTBEGxTMG4pM343RIxXFaLTcNh
4QKL4aQ5W3oCIDn/W+BkzcIu5Q4xFACdVccC+IQYHuXcNz16r92XEupPMA0GCSqG
SIb3DQEBCwUAA4IBAQCDEKJQQ5uKCh4ZCRYZdV3BAGezuWSttmXZO/X09Ey7XSgP
/ugQsSjy34n1UfCEjF3n6WE26NzSv+XgHIL5e+c5qEdpLelxutHh5+X9V/DHHeTI
zlpLDBWGs0LCZN60lYB6s/TcYMHP42nTAAiBst8OqhYbxWJIYGsrVXMGRbraUnQ0
Tin4bpPE3/6icwl3amUyNLFPdFT1ICQjNvlN/fHe4fjVFwihg6qCVehs/bTjAGby
sjuXlfZuzFcDq58IBmnPV0xLOXzFq+rHXjp9q0znFAQkNZDrMj5/hlenCMTrJaug
RuDx0l8KDEmXkJHnq3Faxgit3z8+N/OtQDPvHicf
-----END CERTIFICATE-----

* SSL connected
DOWN: 0 of 0
percent: nan
> GET /playlist/detail?id=72614739 HTTP/1.1
Host: netease-cloud-music-api-theta-steel.vercel.app
User-Agent: libnx curl example/1.0
Cookie: MUSIC_U=9e591e925815b53fe5ca6d4520ce8486eec6d7bc13b06964808ca0b88d73d7361e8907c67206e1edd78b6050a17a35e705925a4e6992f61dfe3f0151024f9e31; __csrf=c59a68e3f9352e03ee1e9add68699671; NMTID=00OeEXesqyubFTgh05eputIjnoqQOgAAAF_YlmsmA
Accept: application/json
Content-Type: application/json
charset: utf-8
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< Content-Type: application/json; charset=utf-8
< Connection: keep-alive
< date: Thu, 10 Mar 2022 12:43:03 GMT
< x-powered-by: Express
< access-control-allow-origin: *
< access-control-allow-credentials: true
< access-control-allow-headers: X-Requested-With,Content-Type
< content-length: 109584
< cache-control: max-age=120
< etag: W/"1ac10-wlS3CzBvLXgM091kGSNBPsURYL8"
< access-control-allow-methods: PUT,POST,GET,DELETE,OPTIONS
< x-vercel-cache: MISS
< age: 0
< server: Vercel
< x-vercel-id: hnd1::iad1::slllc-1646916179821-ef28f1497684
< strict-transport-security: max-age=63072000; includeSubDomains; preload
<
```
### json-c
### 解析
访问网易云音乐的响应都是 json 格式的，想获取里面的内容就要解析，就以下面的 json 为例来讲解解析的过程。
```plain text
{
  data: {
    code: 200,
    unikey: "xxx"
  },
  code: 200
}
```
- 先解析整个响应字符串
- 第一层是 data ，json_object_object_get_ex(parsed_json, "data", &data); 获取 data json 对象
- 然后获取 unikey json 对象，json_object_object_get_ex(data, "unikey", &key);
- 接着获取 unikey 的字符串，const char \*str_key = json_object_get_string(key);，完成解析。
```plain text
char *response_body = (char *)ptr;
struct json_object *parsed_json;
parsed_json = json_tokener_parse(response_body);
struct json_object *data;
json_object_object_get_ex(parsed_json, "data", &data);
struct json_object *key;
json_object_object_get_ex(data, "unikey", &key);
const char *str_key = json_object_get_string(key);
```
### 释放内存
获取到对应的数据后要释放内存，json-c 对 json 对象采用引用计数，使用结束后，使用 json_object_put(parsed_json); 减少引用计数，引用计数减少为 0 、json-c 自动释放内存。
```plain text
 json_object_put(parsed_json);
```
### sdl2
### 渲染文字
渲染文字本质上就是按字体的描述渲染像素点，先加载一个带中文的字体，指定颜色。
```plain text
SDL_Color colors[] = {
    {128, 128, 128, 0}, // gray
    {255, 255, 255, 0}, // white
    {255, 0, 0, 0},     // red
    {0, 255, 0, 0},     // green
    {0, 0, 255, 0},     // blue
    {255, 255, 0, 0},   // brown
    {0, 255, 255, 0},   // cyan
    {255, 0, 255, 0},   // purple
    {0,0,0,0},
};

// load font from romfs
TTF_Font *font = TTF_OpenFont("romfs:/data/simhei.ttf", 36);
```
再来看 render_text ，先使用 TTF_RenderUTF8_Solid 创建 surface 然后通过 surface 创建 texture 。最后通过 SDL_RenderCopy 把 texture 的数据拷贝到 renderer，下次 renderer 渲染的时候把这个 texture 也渲染出来。通过 SDL_FreeSurface 和 SDL_DestroyTexture 将 surface、texture 内存释放。
```plain text
void render_text(SDL_Renderer *renderer, const char *text, TTF_Font *font, SDL_Color color, SDL_Rect *rect)
{
    SDL_Surface *surface;
    SDL_Texture *texture;

    surface = TTF_RenderUTF8_Solid(font, text, color);
    texture = SDL_CreateTextureFromSurface(renderer, surface);
    rect->w = surface->w;
    rect->h = surface->h;

    SDL_FreeSurface(surface);

    SDL_RenderCopy(renderer, texture, NULL, rect);
    SDL_DestroyTexture(texture);
}
```
### 渲染图片
和渲染文字类似，不同的是通过图片创建 surface 然后创建 texture 。
```plain text
void render_image(SDL_Renderer *renderer, const char *path, SDL_Rect *rect)
{
    SDL_Surface *surface;
    SDL_Texture *texture;
    surface = IMG_Load(path);
    rect->w = surface->w;
    rect->h = surface->h;
    texture = SDL_CreateTextureFromSurface(renderer, surface);
    SDL_FreeSurface(surface);

    SDL_RenderCopy(renderer, texture, NULL, rect);
    SDL_DestroyTexture(texture);
}
```
### 渲染列表
歌单中的歌曲需要列表控件，歌曲一般很多，又需要列表是可滚动的。渲染列表选择多个文字框，也就是渲染多行文字。
- 渲染在屏幕的歌曲行数设定为 item_size，开始渲染的歌曲设定为 start ，选择的歌曲索引为 index ，当 start + item_size - 1 \< index，也就是不够渲染到 index 了，列表滚动、滚动的结果是 start = index - (item_size - 1);。
- 实际渲染歌曲过程，遍历 item_size， for (i = 0; i \< item_size; i++)，实际的歌曲索引为 phy_index = start + i;。
```plain text
int render_list(SDL_Renderer *renderer, const Song *song, const int song_len, const int index, TTF_Font *font, SDL_Color color, SDL_Color selected_color, SDL_Rect *rect, int item_size, int start)
{
    if (song_len < item_size) {
        item_size = song_len;
    }
    if(start + item_size - 1 < index){
        start = index - (item_size - 1);
    }
    if(start > index){
        start = index;
    }
    int i, phy_index;
    for (i = 0; i < item_size; i++)
    {

        SDL_Surface *surface;
        SDL_Texture *texture;
        phy_index = start + i;

        if (phy_index == index) {
            surface = TTF_RenderUTF8_Solid(font, song[phy_index].name, selected_color);
        } else{
            surface = TTF_RenderUTF8_Solid(font, song[phy_index].name, color);
        }

        texture = SDL_CreateTextureFromSurface(renderer, surface);
        rect->w = surface->w;
        rect->h = surface->h;

        SDL_FreeSurface(surface);
        SDL_RenderCopy(renderer, texture, NULL, rect);
        rect->y = rect->y + 44;
        SDL_DestroyTexture(texture);
    }
    return start;
}
```
### 其他
### c 连接字符串：栈、堆
在 c 语言中，拼接字符串可以利用堆，也可以利用栈。利用栈的好处是过了作用域，理论上编译器负责回收内存。堆上要程序员自己来。这么一看好像只应该利用栈拼接字符串，但如果全局变量在栈上分配内存来拼接字符串在程序运行期间永远都不会释放，因为全局变量所属的栈在程序运行期间都有效，这样就浪费了一部分内存。
### 堆
qr_res 是一个全局变量，可以看到 free(qr_res);，释放了前面的 qr_res。最后在 qr_res 彻底使用完毕也会释放。
```plain text
char *r = malloc(strlen(qr_res) + strlen(response_body) + 1);
strcpy(r, qr_res);
strcat(r, response_body);
free(qr_res);
qr_res = r;
```
### 栈
s 是栈上的内存，离开作用域后编译器负责释放内存。
```plain text
char s[S_STR_SIZE] = {0};
snprintf(s, sizeof(s), "%s%s%s%s", BASE_URL, "/login/qr/create?key=", str_key, "&qrimg=true");
```
### 缓存
已经下载的 mp3 就没必要下载了。本项目以 mp3 的 id 作为缓存的 key ，已经下载并且文件大小大于 1024b 的不用重新下载。
```plain text
char file_name[200] = {0};
snprintf(file_name, sizeof(file_name), "%d%s", id, ".mp3");

// has file and file size >= 1024b

if (access(file_name, F_OK) == 0)
{
    // file exists
    FILE *file = fopen(file_name, "r");
    char buffer[1024];
    int r = fread(buffer, 1,1024,file);
    printf("read %d \n", r);
    return r == 1024;
}
else
{
    // file doesn't exist
    return 0;
}
```
### c base 64
二维码的图片是 base64 格式的，需要解码为二进制数据，下面的函数负责把得到的字符串解码为二进制。
```plain text
unsigned char *base64_decode(const char *data,
                             size_t input_length,
                             size_t *output_length)
{

    if (decoding_table == NULL)
        build_decoding_table();

    if (input_length % 4 != 0)
        return NULL;

    *output_length = input_length / 4 * 3;
    if (data[input_length - 1] == '=')
        (*output_length)--;
    if (data[input_length - 2] == '=')
        (*output_length)--;

    unsigned char *decoded_data = malloc(*output_length);
    if (decoded_data == NULL)
        return NULL;

    for (int i = 0, j = 0; i < input_length;)
    {

        uint32_t sextet_a = data[i] == '=' ? 0 & i++ : decoding_table[(unsigned char)data[i++]];
        uint32_t sextet_b = data[i] == '=' ? 0 & i++ : decoding_table[(unsigned char)data[i++]];
        uint32_t sextet_c = data[i] == '=' ? 0 & i++ : decoding_table[(unsigned char)data[i++]];
        uint32_t sextet_d = data[i] == '=' ? 0 & i++ : decoding_table[(unsigned char)data[i++]];

        uint32_t triple = (sextet_a << 3 * 6) + (sextet_b << 2 * 6) + (sextet_c << 1 * 6) + (sextet_d << 0 * 6);

        if (j < *output_length)
            decoded_data[j++] = (triple >> 2 * 8) & 0xFF;
        if (j < *output_length)
            decoded_data[j++] = (triple >> 1 * 8) & 0xFF;
        if (j < *output_length)
            decoded_data[j++] = (triple >> 0 * 8) & 0xFF;
    }

    return decoded_data;
}
```
### 播放 mp3
sdl 支持简单的 mp3 播放和暂停，在本项目简单的应用场景下决定使用它，它底层其实也使用 mpg123 进行解码。先初始化 sdl 的音频模块。
```plain text
Mix_Init(MIX_INIT_MP3);

// open 44.1KHz, signed 16bit, system byte order,
//  stereo audio, using 4096 byte chunks
Mix_OpenAudio(44100, MIX_DEFAULT_FORMAT, MIX_DEFAULT_CHANNELS, 4096);

...
```
- audio = Mix_LoadMUS(url); 加载 mp3
- Mix_PlayMusic(audio, 1); 播放 mp3
```plain text
char url[S_STR_SIZE] = {0};
snprintf(url, sizeof(url), "%d.mp3", s->id);

audio = Mix_LoadMUS(url);
if(audio){
    Mix_PlayMusic(audio, 1); // Play the audio file
}
```
# 展示
![](https://cdn.nlark.com/yuque/0/2022/jpeg/102615/1646903858873-51d5cd23-2cba-42be-9be7-457057486864.jpeg)
![](https://cdn.nlark.com/yuque/0/2022/jpeg/102615/1646903878184-97130102-0617-4f78-9d6c-293654a5d0f1.jpeg)
#
