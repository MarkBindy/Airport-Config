
<!-- 官方徽标 -->
<p align="Left">
  <a href="" target="_blank">
    <img src="https://img.shields.io/badge/Telegram-Channel-26A5E4?logo=telegram&logoColor=white"/>
  </a>
  &nbsp;
  <a href="" target="_blank">
    <img src="https://img.shields.io/badge/YouTube-@seven1echo-FF0000?logo=youtube&logoColor=white" />
  </a>
  &nbsp;
  <a href="https://github.com/MarkBindy/Airport-Config" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-Yaml-181717?logo=github&logoColor=white" />
  </a>
</p>
---
自用机场配置分流故障转移规则yaml文件
# Rules And Scripts
各平台的分流规则、复写规则及自动化脚本。
## 前言
### 📝 配置随笔
> [!TIP]
>
>  本项目的配置文件适用于 **[Mihomo](https://github.com/MetaCubeX/mihomo) 核心** 的工具使用，如：**[OpenWrt](https://firmware-selector.immortalwrt.org/)插件（ [OpenClash](https://github.com/vernesong/openclash) / [Nikki](https://github.com/nikkinikki-org/OpenWrt-nikki) ）、[Clashmi](https://github.com/KaringX/clashmi)、[FlClash](https://github.com/chen08209/FlClash)、[Bettbox](https://github.com/appshubcc/Bettbox)  ……**
> 
>  使用需完善 **订阅链接** 与 **机场名**，
>
>  配置文件默认开启 **绕过中国大陆模式**，匹配大陆IP-CIDR（流量不进入代理）。


### 🗂️ 配置区分
| 类型 | **Geo** | **Rule-Set** | **Overwrite** |
|:--:|:--:|:--:|:--:|
| 说明 | 使用**GeoSite / GeoIP** 数据库分流 | 使用**Rule-Set** 规则集分流 | 软件覆写文件 |
| 文件 | [Seven1_fallback_Geo.yaml](https://github.com/Seven1echo/Yaml/blob/main/Seven1_fallback_Geo.yaml) | [Seven1_fallback_Rule-Set.yaml](https://github.com/Seven1echo/Yaml/blob/main/Seven1_fallback_Rule-Set.yaml) | ***_Overwrite.yaml |


## 特别声明
```
binutils bzip2 diff find flex gawk gcc-6+ getopt grep install libc-dev libz-dev
make4.1+ perl python3.7+ rsync subversion unzip which
```
