/*
 * Clash / Mihomo (Clash Meta) 配置文件预处理脚本
 * URL: https://raw.githubusercontent.com/MarkBindy/Airport-Config/refs/heads/main/Rewrite.json
 * 
 * 完整的高级全局配置、TUN、Sniffer 以及分流 DNS 防泄漏设置
 * 性能与规范：使用了 Mihomo 内置的 filter 正则过滤节点机制，无需遍历 DOM 加载速度极快且保持配置的轻量纯净
 * 深度集成：YAML 锚点正则过滤 + 故转/手动/自动三级策略组 + 完整分流规则与包含高级逻辑运算符（AND/NOT/OR）的精准 Rules
 */

function main(config) {
  // 当前选中的所有机场节点都会合并到 config.proxies,获取订阅中的节点列表
  const currentProxies = Array.isArray(config && config.proxies) ? config.proxies : [];

// █████████████████████████████████████████████
//  一. 全局基础配置
// █████████████████████████████████████████████
  const fixed = {
    "port": 7890,                                 // 监听端口  HTTP(S) 代理端口
    "socks-port": 7891,                           // 监听端口  SOCKS5 代理端口
    "redir-port": 7892,                           // 监听端口  重定向代理端口
    "mixed-port": 7893,                           // 监听端口  HTTP + SOCKS5 混合代理端口
    "tproxy-port": 7895,                          // 监听端口  透明代理端口
    "allow-lan": false,                           // 局域连接  是否允许局域网设备连接
    "bind-address": "*",                          // 监听接口  监听的网络接口（* 表示所有接口）
    "mode": "rule",                               // 工作模式  rule（规则模式）/ global（全局模式）/ direct（直连模式）
    "ipv6": true,                                 // 网络协议  是否启用 IPv6 支持
    "log-level": "info",                          // 日志级别  silent（静默）/ error（错误）/ warning（警告）/ info（信息）/ debug（调试）
    "external-controller": "127.0.0.1:9090",      // 外部控制  API（RESTful API）监听地址与端口
    "unified-delay": true,                        // 统一延迟  减少节点延迟抖动
    "tcp-concurrent": true,                       // 并发连接  提升多任务性能
    //"keep-alive-idle": 600,                       // 保活时间  TCP
    //"keep-alive-interval": 15,                    // 保活时间  间隔 TCP
    "global-ua": "clash",                         // 用户代理  全局默认UA
    "geodata-loader": "memconservative",          // 数据加载  模式 standard（标准）memconservative（低内存）       
    "profile": {
      "store-selected": true,                     // 保存选择  记住选择的节点和策略组
      "store-fake-ip": true                       // 保存选择  Fake-IP 映射
    },
    
    "experimental": {
      "quic-go-disable-gso": true,                // 快速禁用  GSO
      "quic-go-disable-ecn": true,                // 快速禁用  ECN
      "dialer-ip4p-convert": false                // 地址转换  IP4P
    },

    // TUN 虚拟网卡
    "tun": {
      "enable": true,                             // 网卡模式  是否启用 TUN 虚拟网卡模式
      "stack": "mips",                            // 协议类型  网络栈：system（系统栈）/ gvisor（内置用户态栈）/ mixed（混合）
      //"mtu": 1492,                                // 最大传输  单元
      "dns-hijack": [                             // 劫持请求  劫持所有 UDP/TCP 53 端口的 DNS 请求
        "udp://any:53",
        "tcp://any:53"
      ],
      "auto-route": true,                         // 自动路由  自动添加系统路由表      （仅内核模式有效）
      "auto-redirect": true,                      // 自动定向  自动将流量重定向至 TUN  （仅内核模式有效）
      "auto-detect-interface": true,              // 自动出口  自动识别默认出口网络接口 （仅内核模式有效）
      "strict-route": true,                       // 路由模式  严格路由,所有流量包括未匹配 auto-route 规则、其他网卡产生的流量,都会被强制送入 TUN，避免 DNS/流量 绕过代理直接从物理网卡发出而泄露
      "route-exclude-address": [                  // 路由排除  本机连接 局域网设备/Docker/虚拟网卡 等可能受影响，按需把相关网段/接口排除掉，保证局域网访问和虚拟化网络正常
        "192.168.0.0/16",
        "10.0.0.0/8",
        "172.16.0.0/12"
      ],
      "exclude-interface": [                      // 排除接口
        "docker*",
        "podman*"
      ],
      "endpoint-independent-nat": true,           // 端点无关  NAT（提高 NAT 类型兼容性，适用于 P2P 和游戏）
      "route-exclude-address-set": ["cn_ip"]      // 绕过大陆  匹配大陆IP-CIDR（流量不进入代理）
    },

    // Sniffer 嗅探
    "sniffer": {
      "enable": true,                             // 启用嗅探  提升分流准确性
      "override-destination": true,               // 成功解析  使用嗅探到的域名覆盖原始目标地址
      "parse-pure-ip": true,                      // 反向解析  解析纯 IP 连接（尝试反向解析获得域名）
      "force-dns-mapping": true,                  // 强制映射  DNS 映射（对纯 IP 连接尝试 DNS 映射）
      "sniff": {
        "QUIC": { "ports": [443, 8443] },         // 嗅探参数  QUIC 协议流量（HTTP/3 常用端口）
        "TLS": { "ports": [443, 8443] },          // 嗅探参数  HTTPS（TLS）常用及备用端口
        "HTTP": { "ports": [80, "8080-8880"] }    // 嗅探参数  HTTP 及常见 Web 代理端口段
      },
      "force-domain": [
        "+.netflix.com",                          // 强制嗅探  Netflix 主域名
        "+.nflxvideo.net",                        // 强制嗅探  Netflix CDN
        "+.amazonaws.com",                        // 强制嗅探  AWS 云服务
        "+.media.dssott.com",                     // 强制嗅探  Disney+ 流媒体
        "+.tiktok.com"                            // 强制嗅探  TikTok 流媒体
      ],
      "skip-domain": [
        "Mijia Cloud",                            // 跳过嗅探  米家云服务
        "dlg.io.mi.com",                          // 跳过嗅探  小米设备通信
        "+.oray.com",                             // 跳过嗅探  花生壳服务
        "+.sunlogin.net",                         // 跳过嗅探  向日葵远程控制
        "+.push.apple.com"                        // 跳过嗅探  苹果推送服务
      ]
    },

    // DNS 防泄漏
    "dns": {
      "enable": true,                             // 解析服务  启用 Clash 内置 DNS 服务
      "ipv6": true,                               // 网络协议  启用 IPv6 DNS 解析支持
      "prefer-h3": false,                         // 首选 H3   false 不使用
      "respect-rules": true,                      // 遵循规则  强制遵循规则顺序
      "use-hosts": true,                          // 配置映射  使用 Mihomo 配置中的 hosts 映射,优先使用 hosts 记录，
      "use-system-hosts": false,                  // 系统映射  使用操作系统 hosts 文件中的域名映射
      "cache-algorithm": "arc",                   // 缓存算法
      //"listen": "0.0.0.0:7874",                   // 监听服务  DNS 服务监听地址与端口
      "enhanced-mode": "fake-ip",                 // 增强模式  FDNS 增强模式（Fake-IP，用于防止 DNS 泄露）
      "fake-ip-range": "198.18.0.1/16",           // 虚拟地址  Fake-IP 虚拟地址池范围
      "fake-ip-filter-mode": "blacklist",         // 过滤模式  Fake-IP 过滤模式（命中规则则返回真实 IP）
      "fake-ip-filter": [
        "*.lan",                                  // 真实解析  常见局域网域名后缀
        "*.local",
        "localhost",
        "*.localdomain",
        "*.msftconnecttest.com",
        "*.msftncsi.com",
        "*.msidentity.com",
        "captive.apple.com",
        "*.push.apple.com",
        "stun.*",
        "+.stun.*.*",
        "+.stun.*.*.*",
        "+.stun.*.*.*.*",
        "+.stun.*.*.*.*.*",
        "+.weixin.com",
        "+.wechat.com",
        "+.qq.com",
        "+.tencent.com",
        "localhost.ptlogin2.qq.com",
        "time.windows.com",
        "time.apple.com",
        "time.android.com",
        "+.googleapis.cn",
        "+.xn--ngstr-lra8j.com",
        "+.ntp.org.cn",
        "+.pool.ntp.org",
        "speedtest.net",
        "rule-set:fakeipfilter_domain",
        "rule-set:add_direct_domain",             // 真实解析  大陆冷门域名
        "geosite:cn"                              // 真实解析  大陆域 GeoSite 数据
      ],
      // 默认解析服务器：仅用于解析本地策略组、订阅和一些基础的纯 IP 节点域名
      "default-nameserver": ["1.1.1.1", "8.8.8.8"],
      // 直连查询服务器
      "direct-nameserver": ["223.6.6.6", "119.29.29.29", "https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
      "direct-nameserver-follow-policy": true,    // 直连查询服务器遵循策略
      // 节点域名解析服务器
      "proxy-server-nameserver": ["1.1.1.1", "8.8.8.8"],
      // 基础查询服务器：未命中 nameserver-policy 的域名走境外加密 DoH（阻断局域网直接向运营商泄漏）
      "nameserver": ["https://1.1.1.1/dns-query", "https://1.0.0.1/dns-query", "https://8.8.8.8/dns-query", "https://8.8.4.4/dns-query", "https://dns.google/dns-query"],
      // 严格分流策略：按域名分流 DNS 解析，国内域名绝不走海外，海外域名绝不走国内大厂
      "nameserver-policy": {
        "geosite:cn": ["223.6.6.6", "119.29.29.29", "https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
        "geosite:apple-cn": ["223.6.6.6", "119.29.29.29", "https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
        "geosite:apple@cn": ["223.6.6.6", "119.29.29.29", "https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
        "+.cn": ["223.6.6.6", "119.29.29.29", "https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
        "+.中国": ["223.6.6.6", "119.29.29.29", "https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
        "+.公司": ["223.6.6.6", "119.29.29.29", "https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
        "+.网络": ["223.6.6.6", "119.29.29.29", "https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
        "+.google.com": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
        "+.googleapis.com": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
        "+.googleapis.cn": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
        "+.android.com": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
        "+.xn--ngstr-lra8j.com": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
        "+.googleusercontent.com": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
        "+.gstatic.com": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
        "+.ggpht.com": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
        "+.gvt1.com": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
        "+.gvt2.com": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
        "+.gvt3.com": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
        "+.openai.com": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
        "+.chatgpt.com": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
        "+.anthropic.com": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
        "+.claude.ai": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
        "geosite:category-ai-!cn": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
        "geosite:geolocation-!cn": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"]
      },
      // 备用查询服务器
      "fallback": ["1.0.0.1", "8.8.4.4", "https://dns.cloudflare.com/dns-query", "https://1dot1dot1dot1.cloudflare-dns.com/"],
      // 备用过滤器
      "fallback-filter": {                        
        "geoip": true,
        "geoip-code": "CN",
        "geosite": ["gfw"],
        "domain": [
          "+.openai.com",
          "+.chatgpt.com",
          "+.anthropic.com",
          "+.claude.ai",
          "+.google.com",
          "+.googleapis.com",
          "+.googleapis.cn",
          "+.gstatic.com",
          "+.gvt1.com",
          "+.gvt2.com",
          "+.gvt3.com",
          "+.googleusercontent.com",
          "+.ggpht.com",
          "+.android.com",
          "+.xn--ngstr-lra8j.com",
          "+.googlevideo.com",
          "+.youtube.com",
          "+.ytimg.com",
          "+.facebook.com",
          "+.instagram.com",
          "+.x.com",
          "+.twitter.com",
          "+.telegram.org"
        ],
        "ipcidr": ["240.0.0.0/4", "127.0.0.0/8", "0.0.0.0/32"]
      }
    }
  };

// █████████████████████████████████████████████
// 二. 节点池设置
// █████████████████████████████████████████████
  fixed.proxies = currentProxies;

// █████████████████████████████████████████████
// 三. 策略出站与区域正则定义 (对齐 YAML 锚点)
// █████████████████████████████████████████████
  const filterHK = '(?i)^(?=.*(香港|(?<![a-zA-Z])(HK|hk|hkg)(?![a-zA-Z])|Hong|Hong Kong|HongKong|hong kong|hongkong|🇭🇰)).*$';
  const filterTW = '(?i)^(?=.*(台湾|台灣|(?<![a-zA-Z])(TW|tw|tpe|khh|tsa)(?![a-zA-Z])|Tai|Tai Wan|TaiWan|tai wan|taiwan|taipei|🇹🇼)).*$';
  const filterJP = '(?i)^(?=.*(日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<![a-zA-Z])(JP|jp|nrt|hnd|kix|cts|fuk)(?![a-zA-Z])|Japan|japan|Tokyo|tokyo|🇯🇵)).*$';
  const filterKR = '(?i)^(?=.*(韩国|韓國|首尔|春川|(?<![a-zA-Z])(KR|kr|icn|gmp|pus)(?![a-zA-Z])|Korea|korea|seoul|🇰🇷)).*$';
  const filterSG = '(?i)^(?=.*(新加坡|狮城|(?<![a-zA-Z])(SG|sg|sin|xsp)(?![a-zA-Z])|Singapore|singapore|🇸🇬)).*$';
  const filterGB = '(?i)^(?=.*(英国|伦敦|(?<![a-zA-Z])(UK|uk|G B|g b|sfo|jfk|sjc|MAD|BCN)(?![a-zA-Z])|United Kingdom|united Kingdom|Great Britain|great britain|🇬🇧)).*$';
  const filterUS = '(?i)^(?=.*(美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|(?<![a-zA-Z])(US|us|usa|lax|sfo|jfk|sjc)(?![a-zA-Z])|America|america|United States|united states|States|🇺🇸)).*$';
  const filterOT = '^((?!(到期|过期|剩余|网址|官网|邮箱|订阅|套餐|流量|说明|重置|直连|DIRECT|香港|HK|hk|hkg|Hong|Hong Kong|HongKong|hong kong|hongkong|🇭🇰|台湾|台灣|TW|tw|tpe|khh|tsa|Tai|Tai Wan|TaiWan|tai wan|taiwan|taipei|🇹🇼|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|JP|jp|nrt|hnd|kix|cts|fuk|Japan|japan|Tokyo|tokyo|🇯🇵|韩国|韓國|首尔|春川|KR|kr|icn|gmp|pus|Korea|korea|seoul|🇰🇷|新加坡|狮城|SG|sg|sin|xsp|Singapore|singapore|🇸🇬|英国|伦敦|UK|uk|G B|g b|sfo|jfk|sjc|MAD|BCN|United Kingdom|united Kingdom|Great Britain|great britain|🇬🇧|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|US|us|usa|lax|sfo|jfk|sjc|America|america|United States|united states|States|🇺🇸)).)*$';
  const filterAL = '^((?!(到期|过期|剩余|网址|官网|邮箱|订阅|套餐|流量|说明|重置|直连|DIRECT)).)*$';

  const anchorPGProxies = [
    "🇭🇰 香港-故转", "🇹🇼 台湾-故转", "🇯🇵 日本-故转", "🇰🇷 韩国-故转",
    "🇸🇬 狮城-故转", "🇬🇧 英国-故转", "🇺🇸 美国-故转", "♻️ 其他-故转",
    "🇭🇰 香港-自动", "🇹🇼 台湾-自动", "🇯🇵 日本-自动", "🇰🇷 韩国-自动",
    "🇸🇬 狮城-自动", "🇬🇧 英国-自动", "🇺🇸 美国-自动", "♻️ 其他-自动",
    "🌐 全部-自动", "DIRECT"
  ];

  const proxyGroups = [];

  // 1. 服务类策略组 (Anchor_PG)
  const serviceGroups = [
    { name: "🚀 默认代理", icon: "https://github.com/MarkBindy/Airport-Config/raw/main/icon/qure/color/Rocket.png" },
    { name: "🍀 Google", icon: "https://github.com/MarkBindy/Airport-Config/raw/main/icon/qure/color/Google.png" },
    { name: "🤖 Ai", icon: "https://github.com/MarkBindy/Airport-Config/raw/main/icon/qure/color/ChatGPT.png" },
    { name: "📹 YouTube", icon: "https://github.com/MarkBindy/Airport-Config/raw/main/icon/qure/color/YouTube.png" },
    { name: "🎵 TikTok", icon: "https://github.com/MarkBindy/Airport-Config/raw/main/icon/qure/color/TikTok.png" },
    { name: "🎥 NETFLIX", icon: "https://github.com/MarkBindy/Airport-Config/raw/main/icon/qure/color/Netflix.png" },
    { name: "📲 Telegram", icon: "https://github.com/MarkBindy/Airport-Config/raw/main/icon/qure/color/Telegram.png" },
    { name: "👨🏿‍💻 GitHub", icon: "https://github.com/MarkBindy/Airport-Config/raw/main/icon/qure/color/GitHub.png" },
    { name: "⚡ Speedtest", icon: "https://github.com/MarkBindy/Airport-Config/raw/main/icon/qure/color/Speedtest.png" },
    { name: "🐟 漏网之鱼", icon: "https://github.com/MarkBindy/Airport-Config/raw/main/icon/qure/color/MATCH.png" }
  ];

  serviceGroups.forEach(item => {
    proxyGroups.push({
      name: item.name,
      type: "select",
      "include-all": true,
      proxies: anchorPGProxies,
      icon: item.icon
    });
  });

  // 2. 故转组 (Fallback)
  const fallbackList = [
    { name: "🇭🇰 香港-故转", proxies: ["🇭🇰 香港-手动", "🇭🇰 香港-自动"] },
    { name: "🇹🇼 台湾-故转", proxies: ["🇹🇼 台湾-手动", "🇹🇼 台湾-自动"] },
    { name: "🇯🇵 日本-故转", proxies: ["🇯🇵 日本-手动", "🇯🇵 日本-自动"] },
    { name: "🇰🇷 韩国-故转", proxies: ["🇰🇷 韩国-手动", "🇰🇷 韩国-自动"] },
    { name: "🇸🇬 狮城-故转", proxies: ["🇸🇬 狮城-手动", "🇸🇬 狮城-自动"] },
    { name: "🇬🇧 英国-故转", proxies: ["🇬🇧 英国-手动", "🇬🇧 英国-自动"] },
    { name: "🇺🇸 美国-故转", proxies: ["🇺🇸 美国-手动", "🇺🇸 美国-自动"] },
    { name: "♻️ 其他-故转", proxies: ["♻️ 其他-手动", "♻️ 其他-自动"] }
  ];

  fallbackList.forEach(item => {
    proxyGroups.push({
      name: item.name,
      type: "fallback",
      "empty-fallback": "REJECT",
      interval: 150,
      lazy: false,
      timeout: 3000,
      "max-failed-times": 2,
      hidden: true,
      url: "https://www.gstatic.com/generate_204",
      proxies: item.proxies
    });
  });

  // 3. 手动选择组 (Select + Filter)
  const selectList = [
    { name: "🇭🇰 香港-手动", filter: filterHK },
    { name: "🇹🇼 台湾-手动", filter: filterTW },
    { name: "🇯🇵 日本-手动", filter: filterJP },
    { name: "🇰🇷 韩国-手动", filter: filterKR },
    { name: "🇸🇬 狮城-手动", filter: filterSG },
    { name: "🇬🇧 英国-手动", filter: filterGB },
    { name: "🇺🇸 美国-手动", filter: filterUS },
    { name: "♻️ 其他-手动", filter: filterOT },
    { name: "🌐 全部-手动", filter: null }
  ];

  selectList.forEach(item => {
    const group = {
      name: item.name,
      type: "select",
      "empty-fallback": "REJECT",
      "include-all": true
    };
    if (item.filter) group.filter = item.filter;
    proxyGroups.push(group);
  });

  // 4. 自动测速组 (URL-Test + Filter)
  const urlTestList = [
    { name: "🇭🇰 香港-自动", filter: filterHK },
    { name: "🇹🇼 台湾-自动", filter: filterTW },
    { name: "🇯🇵 日本-自动", filter: filterJP },
    { name: "🇰🇷 韩国-自动", filter: filterKR },
    { name: "🇸🇬 狮城-自动", filter: filterSG },
    { name: "🇬🇧 英国-自动", filter: filterGB },
    { name: "🇺🇸 美国-自动", filter: filterUS },
    { name: "♻️ 其他-自动", filter: filterOT },
    { name: "🌐 全部-自动", filter: filterAL }
  ];

  urlTestList.forEach(item => {
    proxyGroups.push({
      name: item.name,
      type: "url-test",
      "empty-fallback": "REJECT",
      interval: 300,
      lazy: false,
      timeout: 3000,
      "max-failed-times": 2,
      hidden: true,
      url: "https://www.gstatic.com/generate_204",
      tolerance: 50,
      "include-all": true,
      filter: item.filter
    });
  });

  fixed["proxy-groups"] = proxyGroups;

// █████████████████████████████████████████████
// 四. Rules 规则列表
// █████████████████████████████████████████████
  fixed.rules = [
    // --- 拦截境外 QUIC 流量（防止 QoS 导致卡顿）---
    "AND,((NETWORK,UDP),(DST-PORT,443),(NOT,((OR,((GEOSITE,cn),(GEOIP,CN,no-resolve)))))),REJECT",

    // --- 本地/局域网 ---
    "DOMAIN-SUFFIX,localhost,DIRECT",
    "DOMAIN,local.adguard.org,DIRECT",
    "DOMAIN-SUFFIX,local,DIRECT",
    "DOMAIN-SUFFIX,lan,DIRECT",
    "IP-CIDR,0.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,100.64.0.0/10,DIRECT,no-resolve",
    "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,169.254.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
    "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,224.0.0.0/4,DIRECT,no-resolve",
    "IP-CIDR,240.0.0.0/4,DIRECT,no-resolve",
    "IP-CIDR,111.208.73.0/24,DIRECT,no-resolve",
    "GEOSITE,private,DIRECT",
    "GEOIP,private,DIRECT,no-resolve",

    // --- 银行登录修复与风控 SDK ---
    "DOMAIN-SUFFIX,tongdun.net,DIRECT",
    "DOMAIN-SUFFIX,tongduncdn.com,DIRECT",
    "DOMAIN-SUFFIX,ishumei.com,DIRECT",
    "DOMAIN-SUFFIX,riskradar.net,DIRECT",
    "DOMAIN-SUFFIX,geetest.com,DIRECT",
    "DOMAIN-SUFFIX,dingxiangyun.com,DIRECT",
    "DOMAIN-SUFFIX,dingxiangyun.cn,DIRECT",
    "DOMAIN-SUFFIX,trustdevice.net,DIRECT",
    "DOMAIN-SUFFIX,aegis.qq.com,DIRECT",
    "DOMAIN-SUFFIX,antpay.com,DIRECT",
    "DOMAIN-SUFFIX,rong360.com,DIRECT",

    // --- 银行 APP 推送与统计服务 ---
    "DOMAIN-SUFFIX,jiguang.cn,DIRECT",
    "DOMAIN-SUFFIX,jpush.cn,DIRECT",
    "DOMAIN-SUFFIX,jpush.io,DIRECT",
    "DOMAIN-SUFFIX,umeng.com,DIRECT",
    "DOMAIN-SUFFIX,umengcloud.com,DIRECT",
    "DOMAIN-SUFFIX,rongcloud.cn,DIRECT",
    "DOMAIN-SUFFIX,rongcloud.com,DIRECT",

    // --- 国内银行域名 ---
    "DOMAIN-KEYWORD,bank,DIRECT",
    "DOMAIN-SUFFIX,95516.com,DIRECT",
    "DOMAIN-SUFFIX,unionpay.com,DIRECT",
    "DOMAIN-SUFFIX,unionpaysecure.com,DIRECT",
    "DOMAIN-SUFFIX,icbc.com.cn,DIRECT",
    "DOMAIN-SUFFIX,ccb.com,DIRECT",
    "DOMAIN-SUFFIX,ccblife.com,DIRECT",
    "DOMAIN-SUFFIX,boc.cn,DIRECT",
    "DOMAIN-SUFFIX,abchina.com,DIRECT",
    "DOMAIN-SUFFIX,psbc.com,DIRECT",
    "DOMAIN-SUFFIX,bankcomm.com,DIRECT",
    "DOMAIN-SUFFIX,cmbchina.com,DIRECT",
    "DOMAIN-SUFFIX,spdb.com.cn,DIRECT",
    "DOMAIN-SUFFIX,cib.com.cn,DIRECT",
    "DOMAIN-SUFFIX,cebbank.com,DIRECT",
    "DOMAIN-SUFFIX,pingan.com,DIRECT",
    "DOMAIN-SUFFIX,pingan.com.cn,DIRECT",
    "DOMAIN-SUFFIX,cmbwinglungbank.com,DIRECT",
    "DOMAIN-SUFFIX,cmbc.com.cn,DIRECT",
    "DOMAIN-SUFFIX,cgbchina.com.cn,DIRECT",
    "DOMAIN-SUFFIX,hxb.com.cn,DIRECT",
    "DOMAIN-SUFFIX,bankofshanghai.com,DIRECT",
    "DOMAIN-SUFFIX,shrcb.com,DIRECT",
    "DOMAIN-SUFFIX,gzcb.com.cn,DIRECT",
    "DOMAIN-SUFFIX,nbcb.com.cn,DIRECT",
    "DOMAIN-SUFFIX,njcb.com.cn,DIRECT",
    "DOMAIN-SUFFIX,cqrcb.com,DIRECT",
    "DOMAIN-SUFFIX,brcb.com.cn,DIRECT",
    "DOMAIN-SUFFIX,czbank.com,DIRECT",
    "DOMAIN-SUFFIX,hkbchina.com,DIRECT",
    "DOMAIN-SUFFIX,bocd.com.cn,DIRECT",
    "DOMAIN-SUFFIX,bocsh.com,DIRECT",
    "DOMAIN-SUFFIX,srcb.com.cn,DIRECT",
    "DOMAIN-SUFFIX,gdb.com.cn,DIRECT",

    // --- 支付 / 微信生态 ---
    "DOMAIN-SUFFIX,alipay.com,DIRECT",
    "DOMAIN-SUFFIX,alipayobjects.com,DIRECT",
    "DOMAIN-SUFFIX,alipayhk.com,DIRECT",
    "DOMAIN-SUFFIX,antgroup.com,DIRECT",
    "DOMAIN-SUFFIX,antfinancial.com,DIRECT",
    "DOMAIN-SUFFIX,tenpay.com,DIRECT",
    "DOMAIN-SUFFIX,weixin.qq.com,DIRECT",
    "DOMAIN-SUFFIX,wechat.com,DIRECT",
    "DOMAIN-SUFFIX,servicewechat.com,DIRECT",
    "DOMAIN-SUFFIX,qpic.cn,DIRECT",
    "DOMAIN-SUFFIX,qlogo.cn,DIRECT",
    "DOMAIN-SUFFIX,url.cn,DIRECT",
    "DOMAIN-SUFFIX,wechatpay.cn,DIRECT",
    "DOMAIN-SUFFIX,wx.qq.com,DIRECT",
    "DOMAIN-SUFFIX,weixinbridge.com,DIRECT",

    // --- 内容社区：小红书 ---
    "DOMAIN-SUFFIX,xiaohongshu.com,DIRECT",
    "DOMAIN-SUFFIX,xiaohongshu.net,DIRECT",
    "DOMAIN-SUFFIX,xhscdn.com,DIRECT",

    // --- 政务与公共服务 ---
    "DOMAIN-SUFFIX,12315.cn,DIRECT",
    "DOMAIN-SUFFIX,gov.cn,DIRECT",
    "DOMAIN-KEYWORD,12315,DIRECT",
    "DOMAIN-KEYWORD,gjzwfw,DIRECT",
    "DOMAIN-KEYWORD,12306,DIRECT",
    "DOMAIN-SUFFIX,12306.cn,DIRECT",
    "DOMAIN-SUFFIX,govapp.cn,DIRECT",

    // --- 运营商与网络服务 ---
    "DOMAIN-SUFFIX,10086.cn,DIRECT",
    "DOMAIN-SUFFIX,10010.com,DIRECT",
    "DOMAIN-SUFFIX,189.cn,DIRECT",
    "DOMAIN-SUFFIX,chinamobile.com,DIRECT",
    "DOMAIN-SUFFIX,chinaunicom.com,DIRECT",
    "DOMAIN-SUFFIX,chinatelecom.com.cn,DIRECT",

    // --- 小米 / 米家生态 ---
    "DOMAIN-SUFFIX,mi.com,DIRECT",
    "DOMAIN-SUFFIX,miui.com,DIRECT",
    "DOMAIN-SUFFIX,miwifi.com,DIRECT",
    "DOMAIN-SUFFIX,xiaomi.com,DIRECT",
    "DOMAIN-SUFFIX,xiaomicp.com,DIRECT",
    "DOMAIN-SUFFIX,miot-spec.com,DIRECT",

    // --- 智能家居 / 家电品牌 ---
    "DOMAIN-SUFFIX,midea.com,DIRECT",
    "DOMAIN-SUFFIX,midea.com.cn,DIRECT",
    "DOMAIN-SUFFIX,smartmidea.net,DIRECT",
    "DOMAIN-SUFFIX,haier.net,DIRECT",
    "DOMAIN-SUFFIX,haier.com,DIRECT",
    "DOMAIN-SUFFIX,hisense.com,DIRECT",
    "DOMAIN-SUFFIX,tcl.com,DIRECT",
    "DOMAIN-SUFFIX,yeelight.com,DIRECT",
    "DOMAIN-SUFFIX,aqara.com,DIRECT",
    "DOMAIN-SUFFIX,tuya.com,DIRECT",
    "DOMAIN-SUFFIX,tuyaus.com,DIRECT",

    // --- 电商购物 ---
    "DOMAIN-SUFFIX,taobao.com,DIRECT",
    "DOMAIN-KEYWORD,taobao,DIRECT",
    "DOMAIN-SUFFIX,tmall.com,DIRECT",
    "DOMAIN-SUFFIX,jd.com,DIRECT",
    "DOMAIN-SUFFIX,meituan.net,DIRECT",
    "DOMAIN-SUFFIX,meituan.com,DIRECT",
    "DOMAIN-SUFFIX,pinduoduo.com,DIRECT",
    "DOMAIN-SUFFIX,suning.com,DIRECT",

    // --- 内容平台 / 短视频 ---
    "DOMAIN-SUFFIX,douyin.com,DIRECT",
    "DOMAIN-SUFFIX,douyinpic.com,DIRECT",
    "DOMAIN-SUFFIX,iesdouyin.com,DIRECT",
    "DOMAIN-SUFFIX,snssdk.com,DIRECT",
    "DOMAIN-SUFFIX,amemv.com,DIRECT",
    "DOMAIN-SUFFIX,byteimg.com,DIRECT",
    "DOMAIN-SUFFIX,ibytedtos.com,DIRECT",
    "DOMAIN-SUFFIX,volccdn.com,DIRECT",
    "DOMAIN-SUFFIX,ixigua.com,DIRECT",
    "DOMAIN-SUFFIX,bilibili.com,DIRECT",
    "DOMAIN-SUFFIX,bilivideo.com,DIRECT",
    "DOMAIN-SUFFIX,iqiyi.com,DIRECT",
    "DOMAIN-SUFFIX,youku.com,DIRECT",
    "DOMAIN-SUFFIX,weibo.com,DIRECT",
    "DOMAIN-SUFFIX,zhihu.com,DIRECT",

    // --- Apple/微软/腾讯/阿里/百度/云服务/其它 ---
    "GEOSITE,steam@cn,DIRECT",
    "GEOSITE,category-games@cn,DIRECT",
    "GEOSITE,microsoft@cn,DIRECT",
    "GEOSITE,apple-cn,DIRECT",
    "GEOSITE,apple@cn,DIRECT",
    "GEOSITE,apple,DIRECT",
    "DOMAIN-SUFFIX,mzstatic.com,DIRECT",
    "DOMAIN-SUFFIX,itunes.apple.com,DIRECT",
    "DOMAIN-SUFFIX,icloud.com,DIRECT",
    "DOMAIN-SUFFIX,icloud-content.com,DIRECT",
    "DOMAIN-SUFFIX,me.com,DIRECT",
    "DOMAIN-SUFFIX,aaplimg.com,DIRECT",
    "DOMAIN-SUFFIX,cdn20.com,DIRECT",
    "DOMAIN-SUFFIX,cdn-apple.com,DIRECT",
    "DOMAIN-SUFFIX,akadns.net,DIRECT",
    "DOMAIN-SUFFIX,akamaiedge.net,DIRECT",
    "DOMAIN-SUFFIX,edgekey.net,DIRECT",
    "DOMAIN-SUFFIX,mwcloudcdn.com,DIRECT",
    "DOMAIN-SUFFIX,mwcname.com,DIRECT",
    "DOMAIN-SUFFIX,apple.com,DIRECT",
    "DOMAIN-SUFFIX,apple-cloudkit.com,DIRECT",
    "DOMAIN-SUFFIX,apple-mapkit.com,DIRECT",
    "DOMAIN,cn.bing.com,DIRECT",
    "DOMAIN-SUFFIX,office.com,DIRECT",
    "DOMAIN-SUFFIX,office365.com,DIRECT",
    "DOMAIN-KEYWORD,officecdn,DIRECT",
    "DOMAIN-KEYWORD,-cn,DIRECT",
    "DOMAIN-SUFFIX,cn,DIRECT",
    "DOMAIN-SUFFIX,中国,DIRECT",
    "DOMAIN-SUFFIX,公司,DIRECT",
    "DOMAIN-SUFFIX,网络,DIRECT",
    "DOMAIN-SUFFIX,qq.com,DIRECT",
    "DOMAIN-SUFFIX,qqurl.com,DIRECT",
    "DOMAIN-SUFFIX,tencent.com,DIRECT",
    "DOMAIN-SUFFIX,gtimg.com,DIRECT",
    "DOMAIN-SUFFIX,gtimg.cn,DIRECT",
    "DOMAIN-SUFFIX,gtimg.net,DIRECT",
    "DOMAIN-SUFFIX,idqqimg.com,DIRECT",
    "DOMAIN-SUFFIX,qqmail.com,DIRECT",
    "DOMAIN-SUFFIX,foxmail.com,DIRECT",
    "DOMAIN-SUFFIX,weiyun.com,DIRECT",
    "DOMAIN-SUFFIX,myapp.com,DIRECT",
    "DOMAIN-SUFFIX,qcloud.com,DIRECT",
    "DOMAIN-SUFFIX,myqcloud.com,DIRECT",
    "DOMAIN-SUFFIX,tencentcloud.com,DIRECT",
    "DOMAIN-SUFFIX,alicdn.com,DIRECT",
    "DOMAIN-KEYWORD,alicdn,DIRECT",
    "DOMAIN-KEYWORD,alipay,DIRECT",
    "DOMAIN-SUFFIX,aliyuncs.com,DIRECT",
    "DOMAIN-SUFFIX,baidu.com,DIRECT",
    "DOMAIN-SUFFIX,gtimg.com,DIRECT",
    "DOMAIN-SUFFIX,amemv.com,DIRECT",
    "DOMAIN-SUFFIX,bytedance.com,DIRECT",
    "DOMAIN-SUFFIX,byteimg.com,DIRECT",
    "DOMAIN-SUFFIX,csdn.net,DIRECT",
    "DOMAIN-SUFFIX,douban.com,DIRECT",
    "DOMAIN-SUFFIX,doubanio.com,DIRECT",
    "DOMAIN-SUFFIX,163.com,DIRECT",
    "DOMAIN-SUFFIX,126.com,DIRECT",
    "DOMAIN-SUFFIX,127.net,DIRECT",
    "DOMAIN-SUFFIX,xmcdn.com,DIRECT",
    "DOMAIN-SUFFIX,xunlei.com,DIRECT",

    // --- AI 服务 ---
    "GEOSITE,category-ai-!cn,🤖 Ai",

    // --- 国外服务 ---
    "GEOSITE,youtube,📹 YouTube",
    "DOMAIN-SUFFIX,xn--ngstr-lra8j.com,🍀 Google",
    "DOMAIN-SUFFIX,market.android.com,🍀 Google",
    "DOMAIN-SUFFIX,dl-ssl.google.com,🍀 Google",
    "DOMAIN-SUFFIX,developers.google.cn,🍀 Google",
    "DOMAIN-SUFFIX,play.googleapis.com,🍀 Google",
    "DOMAIN-SUFFIX,android.googleapis.com,🍀 Google",
    "DOMAIN-SUFFIX,services.googleapis.cn,🍀 Google",
    "GEOSITE,google,🍀 Google",
    "GEOIP,google,🍀 Google,no-resolve",
    "GEOSITE,tiktok,🎵 TikTok",
    "DOMAIN-KEYWORD,tiktok,🎵 TikTok",
    "GEOSITE,telegram,📲 Telegram",
    "GEOIP,telegram,📲 Telegram,no-resolve",
    "GEOSITE,github,👨🏿‍💻 GitHub",
    "GEOSITE,netflix,🎥 NETFLIX",
    "GEOIP,netflix,🎥 NETFLIX,no-resolve",
    "GEOSITE,disney,🎥 NETFLIX",
    "GEOSITE,speedtest,⚡ Speedtest",
    "GEOSITE,category-speedtest,⚡ Speedtest",
    "GEOSITE,category-speedtest@cn,⚡ Speedtest",
    "GEOSITE,category-speedtest@!cn,⚡ Speedtest",
    "DOMAIN-SUFFIX,intercom.io,🚀 默认代理",
    "DOMAIN-SUFFIX,intercomcdn.com,🚀 默认代理",

    // --- CN 兜底与全局兜底 ---
    "DOMAIN-SUFFIX,microsoft.com,🚀 默认代理",
    "DOMAIN-SUFFIX,microsoftonline.com,DIRECT",
    "DOMAIN-SUFFIX,msftconnecttest.com,DIRECT",
    "DOMAIN-SUFFIX,msftncsi.com,DIRECT",
    "DOMAIN,injections.adguard.org,DIRECT",
    "GEOSITE,geolocation-!cn,🚀 默认代理",
    "GEOSITE,cn,DIRECT",
    "RULE-SET,add_direct_domain,DIRECT",
    "GEOIP,CN,DIRECT",
    "MATCH,🐟 漏网之鱼"
  ];

// █████████████████████████████████████████████
// 五. Rule Providers (远程规则集)
// █████████████████████████████████████████████
  fixed["rule-providers"] = {
    "fakeipfilter_domain": { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/wwqgtxx/clash-rules/release/fakeip-filter.mrs" },
    "add_direct_domain":   { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/Seven1echo/Yaml/refs/heads/main/rules/Seven1_Direct_Domain.mrs" },
    "openai_classical":    { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/OpenAI/OpenAI.list" },
    "youtube_classical":   { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/YouTube/YouTube.list" },
    "cn_ip":               { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.mrs" }
  };
  /*
  fixed["rule-providers"] = {
    // 域名集 (mrs & classical)
    "fakeipfilter_domain":  { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/wwqgtxx/clash-rules/release/fakeip-filter.mrs" },
    "add_direct_domain":    { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/Seven1echo/Yaml/refs/heads/main/rules/Seven1_Direct_Domain.mrs" },
    "cn_domain":            { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs" },
    "private_domain":       { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/private.mrs" },
    "apple_domain":         { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple.mrs" },
    "apple-cn":             { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple-cn.mrs" },
    "ai-!cn":               { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ai-!cn.mrs" },
    "openai_classical":     { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/OpenAI/OpenAI.list" },
    "anthropic_classical":  { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Anthropic/Anthropic.list" },
    "claude_classical":     { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Claude/Claude.list" },
    "copilot_classical":    { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Copilot/Copilot.list" },
    "gemini_classical":     { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://raw.githubusercontent.com/MarkBindy/Airport-Config/refs/heads/main/Rule/Gemini.list" },
    "google_domain":        { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google.mrs" },
    "youtube_classical":    { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/YouTube/YouTube.list" },
    "netflix_classical":    { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Netflix/Netflix.list" },
    "tiktok_domain":        { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/tiktok.mrs" },
    "disney_domain":        { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/disney.mrs" },
    "hbo_domain":           { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/hbo.mrs" },
    "telegram_classical":   { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Telegram/Telegram.list" },
    "whatsapp_classical":   { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Whatsapp/Whatsapp.list" },
    "facebook_domain":      { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/facebook.mrs" },
    "twitter_domain":       { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/x.mrs" },
    "spotify_domain":       { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/spotify.mrs" },
    "paypal_domain":        { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/paypal.mrs" },
    "amazon_domain":        { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/amazon.mrs" },
    "microsoft_domain":     { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/microsoft.mrs" },
    "onedrive_domain":      { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/onedrive.mrs" },
    "reddit_domain":        { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/reddit.mrs" },
    "github_domain":        { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/github.mrs" },
    "okx_domain":           { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/okx.mrs" },
    "bybit_domain":         { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/bybit.mrs" },
    "binance_domain":       { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/binance.mrs" },
    "games@cn_domain":      { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-games@cn.mrs" },
    "steam_domain":         { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/steam.mrs" },
    "epic_classical":       { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Epic/Epic.list" },
    "ea_classical":         { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/EA/EA.list" },
    "blizzard_classical":   { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Blizzard/Blizzard.list" },
    "ubi_classical":        { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/UBI/UBI.list" },
    "nintendo_classical":   { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Nintendo/Nintendo.list" },
    "nvidia_classical":     { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Nvidia/Nvidia.list" },
    "geolocation-!cn":      { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/geolocation-!cn.mrs" },
    "speedtest_domain":     { type: "http", interval: 86400, behavior: "domain", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-speedtest.mrs" },
    "block_classical":      { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://gh-proxy.com/raw.githubusercontent.com/liandu2024/clash/refs/heads/main/list/Block.list" },
    "test_classical":       { type: "http", interval: 86400, behavior: "classical", format: "text", url: "https://gh-proxy.com/raw.githubusercontent.com/liandu2024/clash/refs/heads/main/list/Check.list" },
    
    // IP集 (mrs)
    "cn_ip":                { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.mrs" },
    "private_ip":           { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/private.mrs" },
    "google_ip":            { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/google.mrs" },
    "telegram_ip":          { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/telegram.mrs" },
    "twitter_ip":           { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/twitter.mrs" },
    "netflix_ip":           { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/netflix.mrs" }
  };
  */

  return fixed;
}
