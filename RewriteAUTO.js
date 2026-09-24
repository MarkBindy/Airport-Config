/*
 * Clash / Mihomo (Clash Meta) 配置文件预处理脚本
 * 适合部署在支持 js 预处理的 Clash 客户端中，自动将普通机场订阅转化为功能极其强大且规整重构并重写整份配置
 * 实现自动化的高级分流、防 DNS 泄漏以及精细化策略组管理
 * URL: https://raw.githubusercontent.com/MarkBindy/Airport-Config/refs/heads/main/RewriteAUTO.js
 *
 * 核心功能 / 架构拆解 / 特性：
 * 1.全局配置与高级特性 (Global & Advanced Settings)
 *   网络与内核参数：开启统一延迟计算、TCP 并发连接以及针对内存优化
 *   TUN 虚拟网卡：开启严格路由以防止 DNS 和流量绕过代理，同时对 P2P 下载和联机游戏极具优势的配置
 *   Sniffer 流量嗅探：开启并设置了覆盖目标，能够识别出由于 Fake-IP 或纯 IP 连接导致的真实访问域名
 *
 * 2.严格的防 DNS 泄漏方案 (Anti-DNS Leak)
 *   使用 fake-ip 模式
 *   采用了严格的 nameserver-policy 域名分流
 *   国内域名/服务（如 .cn、geosite:cn 等）走国内 DoH/UDP 解析（阿里 DNS、DNSPod 等）
 *   国外关键服务与 AI 站点（Google、OpenAI 等）强制走 Cloudflare / Google 的海外 DoH 解析
 *   域名防泄漏屏蔽：阻止国内运营商 DNS 拿到海外请求，也阻止海外 DNS 拿到国内请求
 *
 * 3.动态地区策略组生成 (Dynamic Regional Proxy Groups)
 *   脚本内置了 20+ 个常见国家/地区的正则匹配规则（香港、台湾、日本、韩国、新加坡、美国、英国等）
 *   按需生成：只有当你的节点列表中存在某个地区节点时，才会为该地区动态生成对应的策略组，避免空组
 *     地区-手动组 (Select)：列出该地区的所有节点供手动选择
 *     地区-自动组 (URL-Test)：后台自动测速选出延迟最低的节点
 *     地区-故障转移组 (Fallback)：优先走手动选择，断连时自动退回至自动测速组
 *
 * 4.独特的层级化出站结构 (PROXY-Gate 架构)
 *   策略组形成了清晰的下层至上层逻辑：
 *     底层：节点池
 *     中间层 (PROXY-Gate)：合并了 所有-手动、各个地区的 故障转移组 和 自动择优组
 *     顶层服务组（YouTube、Netflix、AI、Google、Github 等）
 *   默认允许选择 所有-手动、PROXY-Gate（总网关）或者具体的 地区故障转移 / 自动组
 *   实现了 “修改一处，全局联动” 的优雅配置
 *
 * 5. 规则集与安全拦截 (Rules & Rule Providers)
 *    QUIC 拦截：通过 AND 规则，强制禁用国外的 QUIC (HTTP/3) 流量，解决部分地区 QUIC 被运营商 QoS 导致加载缓慢的问题
 *    Apple Push 专项处理：单独抽出 APNs 规则组并使用 Fallback 策略，确保苹果系统推送（APNs）在代理波动时不会失效
 *    风控与银行防护：将同盾、数美、极光推送、各大银行域名及微信/支付宝直接划入 DIRECT（直连），防止触发国内银行和风控 SDK 的异地/代理异常警告
 *    远程规则集 (rule-providers)：采用标准 YAML 及 Mihomo 高性能编译格式 (.mrs)，包含广告拦截、隐私防护与各类服务的分流规则
 */


function main(config) {
  // 当前选中的所有机场节点都会合并到 config.proxies,获取订阅中的节点列表
  const currentProxies = Array.isArray(config && config.proxies) ? config.proxies : [];

  const currentProxyNames = currentProxies
    .map(p =>
      typeof p === "string"
        ? p
        : (p && typeof p.name === "string" ? p.name : null)
    )
    .filter(Boolean);

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
      "default-nameserver": [                     // 默认解析服务器：仅用于解析本地策略组、订阅和一些基础的纯 IP 节点域名
        "1.1.1.1",
        "8.8.8.8"
      ],
      "direct-nameserver": [                      // 直连查询服务器
        "223.6.6.6",
        "223.5.5.5",
        "119.29.29.29",
        "https://dns.alidns.com/dns-query",
        "https://doh.pub/dns-query"
      ],
      "direct-nameserver-follow-policy": true,    // 直连查询服务器遵循策略
      "proxy-server-nameserver": [                // 节点域名解析服务器
        "1.1.1.1",
        "8.8.8.8"
      ],
      "nameserver": [                             // 基础查询服务器：未命中 nameserver-policy 的域名走境外加密 DoH（阻断局域网直接向运营商泄漏）
        "https://1.1.1.1/dns-query",
        "https://1.0.0.1/dns-query",
        "https://8.8.8.8/dns-query",
        "https://8.8.4.4/dns-query",
        "https://dns.google/dns-query"
      ],
      "nameserver-policy": {                      // 严格分流策略：按域名分流 DNS 解析，国内域名绝不走海外，海外域名绝不走国内大厂
        "geosite:private,cn,apple-cn,apple@cn,microsoft@cn,category-games@cn,steam@cn": [
          "223.6.6.6",
          "223.5.5.5",
          "119.29.29.29",
          "https://dns.alidns.com/dns-query",
          "https://doh.pub/dns-query"
        ],
        "+.cn": ["223.6.6.6", "223.5.5.5", "119.29.29.29", "https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
        "+.中国": ["223.6.6.6", "223.5.5.5", "119.29.29.29", "https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
        "+.公司": ["223.6.6.6", "223.5.5.5", "119.29.29.29", "https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
        "+.网络": ["223.6.6.6", "223.5.5.5", "119.29.29.29", "https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
        "+.google.com": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
        "+.googleapis.com": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
        "+.googleapis.cn": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
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
        "geosite:category-ai-!cn,geolocation-!cn": ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"]
      },
      "fallback": [                               // 备用查询服务器
        "1.0.0.1",
        "8.8.4.4",
        "https://dns.cloudflare.com/dns-query",
        "https://1dot1dot1dot1.cloudflare-dns.com/"
      ],
      "fallback-filter": {                        // 备用过滤器
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
  fixed["proxy-groups"] = [];

// █████████████████████████████████████████████
// 三. 动态计算与策略组构建
// █████████████████████████████████████████████
  const regionGroups = [
    {key: "HK", name: "🇭🇰 香港", filter: /([\[]HK[\]]|^HK$|Hong[ _-]?Kong|\bHK\b|香港|🇭🇰)/i},
    {key: "TW", name: "🇹🇼 台湾", filter: /([\[]TW[\]]|^TW$|Taiwan|Taibei|Taipei|\bTW\b|台湾|臺灣|台北|高雄|🇹🇼)/i},
    {key: "JP", name: "🇯🇵 日本", filter: /([\[]JP[\]]|^JP$|Japan|\bJP\b|日本|东京|大阪|🇯🇵)/i},
    {key: "KR", name: "🇰🇷 韩国", filter: /([\[]KR[\]]|^KR$|Korea|South[ _-]?Korea|\bKR\b|韩国|韓國|首尔|首爾|🇰🇷)/i},
    {key: "SG", name: "🇸🇬 新加坡", filter: /([\[]SG[\]]|^SG$|Singapore|\bSG\b|新加坡|狮城|🇸🇬)/i},
    {key: "UK", name: "🇬🇧 英国", filter: /([\[]UK[\]]|^UK$|United[ _-]?Kingdom|Britain|England|\bUK\b|英国|英國|伦敦|🇬🇧)/i},
    {key: "RU", name: "🇷🇺 俄罗斯", filter: /([\[]RU[\]]|^RU$|Russia|Russian[ _-]?Federation|\bRU\b|俄罗斯|俄羅斯|莫斯科|伯力|🇷🇺)/i},
    {key: "DE", name: "🇩🇪 德国", filter: /([\[]DE[\]]|^DE$|Germany|Deutschland|\bDE\b|德国|德國|法兰克福|🇩🇪)/i},
    {key: "FR", name: "🇫🇷 法国", filter: /([\[]FR[\]]|^FR$|France|\bFR\b|法国|法國|巴黎|🇫🇷)/i},
    {key: "IT", name: "🇮🇹 意大利", filter: /([\[]IT[\]]|^IT$|Italy|Italian|\bIT\b|意大利|義大利|米兰|米蘭|罗马|羅馬|🇮🇹)/i},
    {key: "CA", name: "🇨🇦 加拿大", filter: /([\[]CA[\]]|^CA$|Canada|\bCA\b|加拿大|🇨🇦)/i},
    {key: "US", name: "🇺🇸 美国", filter: /([\[]US[\]]|^US$|USA|United[ _-]?States|\bUS\b|美国|美國|🇺🇸)/i},
    {key: "MY", name: "🇲🇾 马来西亚", filter: /([\[]MY[\]]|^MY$|Malaysia|Malaysian|\bMY\b|马来西亚|馬來西亞|吉隆坡|🇲🇾)/i},
    {key: "AU", name: "🇦🇺 澳大利亚", filter: /([\[]AU[\]]|^AU$|Australia|\bAU\b|澳大利亚|澳洲|澳大利亞|🇦🇺)/i},
    {key: "ES", name: "🇪🇸 西班牙", filter: /([\[]ES[\]]|^ES$|Spain|Spanish|\bES\b|西班牙|马德里|馬德里|🇪🇸)/i},
    {key: "NL", name: "🇳🇱 荷兰", filter: /([\[]NL[\]]|^NL$|Netherlands|Dutch|\bNL\b|荷兰|荷蘭|阿姆斯特丹|🇳🇱)/i},
    {key: "FI", name: "🇫🇮 芬兰", filter: /([\[]FI[\]]|^FI$|Finland|Finnish|\bFI\b|芬兰|芬蘭|赫尔辛基|赫爾辛基|🇫🇮)/i},
    {key: "NO", name: "🇳🇴 挪威", filter: /([\[]NO[\]]|^NO$|Norway|Norwegian|\bNO\b|挪威|奥斯陆|奧斯陸|🇳🇴)/i},
    {key: "SE", name: "🇸🇪 瑞典", filter: /([\[]SE[\]]|^SE$|Sweden|Swedish|\bSE\b|瑞典|斯德哥尔摩|斯德哥爾摩|🇸🇪)/i},
    {key: "CH", name: "🇨🇭 瑞士", filter: /([\[]CH[\]]|^CH$|Switzerland|Swiss|\bCH\b|瑞士|苏黎世|蘇黎世|日内瓦|日內瓦|🇨🇭)/i},
    {key: "PL", name: "🇵🇱 波兰", filter: /([\[]PL[\]]|^PL$|Poland|Polish|\bPL\b|波兰|波蘭|华沙|華沙|🇵🇱)/i}
  ];

  const existingRegionalFallbacks = [];
  const existingRegionalAutos = [];
  const regionalGroupsToAppend = [];

  // 1. 优先扫描节点生成存在的地区组
  regionGroups.forEach(region => {
    const matched = currentProxyNames.filter(name => region.filter.test(name));
    if (matched.length === 0) return;

    const fallbackName = region.name + "-故障转移";
    const manualName = region.name + "-手动";
    const autoName = region.name + "-自动";

    regionalGroupsToAppend.push({
      name: fallbackName, type: "fallback", proxies: [manualName, autoName], hidden: true,
      icon: "https://raw.githubusercontent.com/MarkBindy/Airport-Config/main/icon/qure/color/Auto.png",
      interval: 300, url: "http://www.gstatic.com/generate_204"
    });

    regionalGroupsToAppend.push({
      name: manualName, type: "select", proxies: matched,
      icon: "https://raw.githubusercontent.com/MarkBindy/Airport-Config/main/icon/qure/color/Available.png"
    });

    regionalGroupsToAppend.push({
      name: autoName, type: "url-test", proxies: matched, hidden: true,
      icon: "https://raw.githubusercontent.com/MarkBindy/Airport-Config/main/icon/qure/color/Auto.png",
      interval: 600, url: "http://www.gstatic.com/generate_204"
    });

    existingRegionalFallbacks.push(fallbackName);
    existingRegionalAutos.push(autoName);
  });

  // 2. 插入顶部主策略组
  fixed["proxy-groups"].push(
    {
      name: "PROXY-Gate",
      type: "select",
      proxies: ["🌐 所有-手动", ...existingRegionalFallbacks, ...existingRegionalAutos, "DIRECT"],
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Final.png"
    },
    {
      name: "Apple Push 苹果通知推送",
      type: "fallback",
      proxies: ["APNs-Fallback", "DIRECT"],
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Apple.png",
      url: "http://captive.apple.com/hotspot-detect.html",
      interval: 300
    },
    {
      name: "🌐 所有-手动",
      type: "select",
      proxies: currentProxyNames.length ? currentProxyNames.slice() : ["DIRECT"],
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Server.png"
    }
  );

  // 3. 构建服务类策略组
  const serviceGroupNames = [
    "Ai", "YouTube", "Netflix", "Disney+", "Spotify", "TikTok", "Twitch",
    "Apple", "Microsoft", "Google", "X", "Facebook", "Instagram",
    "WhatsApp", "Telegram", "Github", "Speedtest"
  ];

  const serviceIcons = {
    "Ai": "https://fastly.jsdelivr.net/gh/shindgewongxj/WHATSINStash/icon/openai.png",
    "YouTube": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/YouTube.png",
    "Netflix": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Netflix.png",
    "Disney+": "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Disney+.png",
    "Spotify": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Spotify.png",
    "TikTok": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/TikTok.png",
    "Twitch": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Twitch.png",
    "Apple": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Apple_2.png",
    "Microsoft": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Microsoft.png",
    "Google": "https://raw.githubusercontent.com/MarkBindy/Airport-Config/main/icon/qure/color/Google.png",
    "X": "https://fastly.jsdelivr.net/gh/shindgewongxj/WHATSINStash/icon/twitter.png",
    "Facebook": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Facebook.png",
    "Instagram": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Instagram.png",
    "WhatsApp": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/whatsapp.png",
    "Telegram": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Telegram.png",
    "Github": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/GitHub.png",
    "Speedtest": "https://cdn.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Speedtest.png"
  };

  const serviceProxyChoices = [
    "🌐 所有-手动",
    ...existingRegionalFallbacks,
    ...existingRegionalAutos,
    "PROXY-Gate",
    "DIRECT"
  ];

  serviceGroupNames.forEach(name => {
    fixed["proxy-groups"].push({
      "name": name,
      "type": "select",
      "icon": serviceIcons[name] || "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Server.png",
      "proxies": serviceProxyChoices.slice()
    });
  });

  // 4. 将动态生成的地区组加入数组
  fixed["proxy-groups"].push(...regionalGroupsToAppend);

  // 5. APNs 专项 Fallback 组
  fixed["proxy-groups"].push({
    name: "APNs-Fallback",
    type: "fallback",
    proxies: existingRegionalFallbacks.length ? existingRegionalFallbacks : ["DIRECT"],
    icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Available_1.png",
    url: "http://captive.apple.com/hotspot-detect.html",
    interval: 300
  });

// █████████████████████████████████████████████
// 四. Rules 规则列表
// █████████████████████████████████████████████
  fixed.rules = [
    // --- 拦截境外 QUIC 流量（防止 QoS 导致卡顿）---
    "AND,((NETWORK,UDP),(DST-PORT,443),(NOT,((OR,((GEOSITE,cn),(GEOIP,CN,no-resolve)))))),REJECT",
    
    // --- 本地/局域网 ---
    "IP-CIDR,111.208.73.0/24,DIRECT,no-resolve",
    "GEOSITE,private,DIRECT",
    "GEOIP,private,DIRECT,no-resolve",

    // --- Apple Push (需要在通用 Apple 规则前生效) ---
    "DOMAIN-SUFFIX,push.apple.com,Apple Push 苹果通知推送",
    "DOMAIN-SUFFIX,push-apple.com.akadns.net,Apple Push 苹果通知推送",
    "DOMAIN-KEYWORD,apple.com.edgekey.net,Apple Push 苹果通知推送",
    "IP-CIDR,17.249.0.0/16,Apple Push 苹果通知推送,no-resolve",
    "IP-CIDR,17.252.0.0/16,Apple Push 苹果通知推送,no-resolve",
    "IP-CIDR,17.57.144.0/22,Apple Push 苹果通知推送,no-resolve",
    "IP-CIDR,17.188.128.0/18,Apple Push 苹果通知推送,no-resolve",
    "IP-CIDR,17.188.20.0/23,Apple Push 苹果通知推送,no-resolve",
    "IP-CIDR6,2620:149:a44::/48,Apple Push 苹果通知推送,no-resolve",
    "IP-CIDR6,2403:300:a42::/48,Apple Push 苹果通知推送,no-resolve",
    "IP-CIDR6,2403:300:a51::/48,Apple Push 苹果通知推送,no-resolve",
    "IP-CIDR6,2a01:b740:a42::/48,Apple Push 苹果通知推送,no-resolve",

    // --- 广告 / 隐私拦截 ---
    "RULE-SET,AdvertisingLite,REJECT",
    "RULE-SET,AdvertisingLite_Domain,REJECT",
    "RULE-SET,Privacy,REJECT",
    "RULE-SET,Privacy_Domain,REJECT",
    "RULE-SET,ACL4SSR_BanAD,REJECT",
    "RULE-SET,ACL4SSR_BanProgramAD,REJECT",

    // --- 银行登录与风控 SDK 修复 (直连防止风控异常) ---
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
    "GEOSITE,category-games@cn,DIRECT",
    "GEOSITE,steam@cn,DIRECT",
    "GEOSITE,apple-cn,DIRECT",
    "GEOSITE,apple@cn,DIRECT",
    "GEOSITE,microsoft@cn,DIRECT",
    "DOMAIN,cn.bing.com,DIRECT",
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
    "GEOSITE,category-ai-!cn,Ai",

    // YouTube
    "DOMAIN-SUFFIX,youtube.com,YouTube",
    "DOMAIN-SUFFIX,youtu.be,YouTube",
    "DOMAIN-SUFFIX,youtube-nocookie.com,YouTube",
    "DOMAIN-SUFFIX,youtubei.googleapis.com,YouTube",
    "DOMAIN-SUFFIX,youtube.googleapis.com,YouTube",
    "DOMAIN-SUFFIX,ytimg.com,YouTube",
    "DOMAIN-SUFFIX,googlevideo.com,YouTube",
    "DOMAIN-SUFFIX,ggpht.com,YouTube",
    "GEOSITE,youtube,YouTube",

    // Netflix
    "DOMAIN-SUFFIX,netflix.com,Netflix",
    "DOMAIN-SUFFIX,netflix.net,Netflix",
    "DOMAIN-SUFFIX,netflix.ca,Netflix",
    "DOMAIN-SUFFIX,nflxext.com,Netflix",
    "DOMAIN-SUFFIX,nflximg.com,Netflix",
    "DOMAIN-SUFFIX,nflximg.net,Netflix",
    "DOMAIN-SUFFIX,nflxsearch.net,Netflix",
    "DOMAIN-SUFFIX,nflxso.net,Netflix",
    "DOMAIN-SUFFIX,nflxvideo.net,Netflix",
    "DOMAIN-SUFFIX,netflixdnstest0.com,Netflix",
    "DOMAIN-SUFFIX,netflixdnstest1.com,Netflix",
    "DOMAIN-SUFFIX,netflixdnstest2.com,Netflix",
    "DOMAIN-SUFFIX,netflixdnstest3.com,Netflix",
    "DOMAIN-SUFFIX,netflixdnstest4.com,Netflix",
    "DOMAIN-SUFFIX,netflixdnstest5.com,Netflix",
    "DOMAIN-SUFFIX,netflixdnstest6.com,Netflix",
    "DOMAIN-SUFFIX,netflixdnstest7.com,Netflix",
    "DOMAIN-SUFFIX,netflixdnstest8.com,Netflix",
    "DOMAIN-SUFFIX,netflixdnstest9.com,Netflix",
    "DOMAIN-SUFFIX,netflixdnstest10.com,Netflix",
    "DOMAIN-SUFFIX,netflixinvestor.com,Netflix",
    "DOMAIN-SUFFIX,netflixtechblog.com,Netflix",
    "DOMAIN,netflix.com.edgesuite.net,Netflix",
    "GEOSITE,netflix,Netflix",
    "GEOIP,netflix,Netflix,no-resolve",

    // Disney+
    "DOMAIN-SUFFIX,disneyplus.com,Disney+",
    "DOMAIN-SUFFIX,disney-plus.net,Disney+",
    "DOMAIN-SUFFIX,dssott.com,Disney+",
    "DOMAIN-SUFFIX,dssedge.com,Disney+",
    "DOMAIN-SUFFIX,bamgrid.com,Disney+",
    "DOMAIN-SUFFIX,media.dssott.com,Disney+",
    "DOMAIN-SUFFIX,disney.playback.edge.bamgrid.com,Disney+",
    "DOMAIN-SUFFIX,star.playback.edge.bamgrid.com,Disney+",
    "DOMAIN-SUFFIX,search-api-disney.bamgrid.com,Disney+",

    // Spotify
    "DOMAIN-SUFFIX,spotify.com,Spotify",
    "DOMAIN-SUFFIX,spotifycdn.com,Spotify",
    "DOMAIN-SUFFIX,scdn.co,Spotify",
    "DOMAIN-SUFFIX,spclient.wg.spotify.com,Spotify",
    "DOMAIN-SUFFIX,api-partner.spotify.com,Spotify",
    "DOMAIN-SUFFIX,heads4-ak-spotify-com.akamaized.net,Spotify",
    "DOMAIN-SUFFIX,spotifycdn.com,Spotify",

    // TikTok
    "DOMAIN-SUFFIX,tiktok.com,TikTok",
    "DOMAIN-SUFFIX,tiktokcdn.com,TikTok",
    "DOMAIN-SUFFIX,tiktokcdn-us.com,TikTok",
    "DOMAIN-SUFFIX,tiktokv.com,TikTok",
    "DOMAIN-SUFFIX,tiktokd.org,TikTok",
    "DOMAIN-SUFFIX,ibytedtos.com,TikTok",
    "DOMAIN-SUFFIX,ibyteimg.com,TikTok",
    "DOMAIN-SUFFIX,byteoversea.com,TikTok",
    "DOMAIN-SUFFIX,muscdn.com,TikTok",
    "DOMAIN-SUFFIX,musical.ly,TikTok",
    "GEOSITE,tiktok,TikTok",

    // Twitch
    "DOMAIN-SUFFIX,twitch.tv,Twitch",
    "DOMAIN-SUFFIX,twitchcdn.net,Twitch",
    "DOMAIN-SUFFIX,jtvnw.net,Twitch",
    "DOMAIN-SUFFIX,ttvnw.net,Twitch",
    "DOMAIN-SUFFIX,twitchsvc.net,Twitch",

    // Apple
    "DOMAIN-SUFFIX,mzstatic.com,Apple",
    "DOMAIN-SUFFIX,itunes.apple.com,Apple",
    "DOMAIN-SUFFIX,icloud.com,Apple",
    "DOMAIN-SUFFIX,icloud-content.com,Apple",
    "DOMAIN-SUFFIX,me.com,Apple",
    "DOMAIN-SUFFIX,aaplimg.com,Apple",
    "DOMAIN-SUFFIX,cdn20.com,Apple",
    "DOMAIN-SUFFIX,cdn-apple.com,Apple",
    "DOMAIN-SUFFIX,akadns.net,Apple",
    "DOMAIN-SUFFIX,akamaiedge.net,Apple",
    "DOMAIN-SUFFIX,edgekey.net,Apple",
    "DOMAIN-SUFFIX,mwcloudcdn.com,Apple",
    "DOMAIN-SUFFIX,mwcname.com,Apple",
    "DOMAIN-SUFFIX,apple.com,Apple",
    "DOMAIN-SUFFIX,apple-cloudkit.com,Apple",
    "DOMAIN-SUFFIX,apple-mapkit.com,Apple",
    "RULE-SET,apple_domain,Apple",

    // Microsoft
    "DOMAIN-SUFFIX,account.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,account.live.com,Microsoft",
    "DOMAIN-SUFFIX,login.live.com,Microsoft",
    "DOMAIN-SUFFIX,login.microsoftonline.com,Microsoft",
    "DOMAIN-SUFFIX,login.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,login.windows.net,Microsoft",
    "DOMAIN-SUFFIX,msauth.net,Microsoft",
    "DOMAIN-SUFFIX,msauthimages.net,Microsoft",
    "DOMAIN-SUFFIX,msftauth.net,Microsoft",
    "DOMAIN-SUFFIX,msftauthimages.net,Microsoft",
    "DOMAIN-SUFFIX,msidentity.com,Microsoft",
    "DOMAIN-SUFFIX,outlook.com,Microsoft",
    "DOMAIN-SUFFIX,outlook.office.com,Microsoft",
    "DOMAIN-SUFFIX,outlook.office365.com,Microsoft",
    "DOMAIN-SUFFIX,hotmail.com,Microsoft",
    "DOMAIN-SUFFIX,hotmail.co.uk,Microsoft",
    "DOMAIN-SUFFIX,live.com,Microsoft",
    "DOMAIN-SUFFIX,live.net,Microsoft",
    "DOMAIN-SUFFIX,office.live.com,Microsoft",
    "DOMAIN-SUFFIX,mail.live.com,Microsoft",
    "DOMAIN-SUFFIX,microsoft365.com,Microsoft",
    "DOMAIN-SUFFIX,office.com,Microsoft",
    "DOMAIN-SUFFIX,office.net,Microsoft",
    "DOMAIN-SUFFIX,office365.com,Microsoft",
    "DOMAIN-SUFFIX,officeapps.live.com,Microsoft",
    "DOMAIN-SUFFIX,officeclient.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,officecdn.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,officecdn.microsoft.com.edgesuite.net,Microsoft",
    "DOMAIN-SUFFIX,msocdn.com,Microsoft",
    "DOMAIN-SUFFIX,microsoftonline.com,Microsoft",
    "DOMAIN-SUFFIX,microsoftonline-p.com,Microsoft",
    "DOMAIN-SUFFIX,microsoftonline-p.net,Microsoft",
    "DOMAIN-SUFFIX,onedrive.com,Microsoft",
    "DOMAIN-SUFFIX,onedrive.live.com,Microsoft",
    "DOMAIN-SUFFIX,1drv.com,Microsoft",
    "DOMAIN-SUFFIX,sharepoint.com,Microsoft",
    "DOMAIN-SUFFIX,sharepointonline.com,Microsoft",
    "DOMAIN-SUFFIX,sharepointonline.com.edgesuite.net,Microsoft",
    "DOMAIN-SUFFIX,teams.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,teams.live.com,Microsoft",
    "DOMAIN-SUFFIX,teams.events.data.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,teams.microsoft.net,Microsoft",
    "DOMAIN-SUFFIX,skype.com,Microsoft",
    "DOMAIN-SUFFIX,skypeforbusiness.com,Microsoft",
    "DOMAIN-SUFFIX,microsoftstore.com,Microsoft",
    "DOMAIN-SUFFIX,microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,store.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,storeedgefd.dsx.mp.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,displaycatalog.mp.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,dl.delivery.mp.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,delivery.mp.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,windows.com,Microsoft",
    "DOMAIN-SUFFIX,windows.net,Microsoft",
    "DOMAIN-SUFFIX,windowsupdate.com,Microsoft",
    "DOMAIN-SUFFIX,windowsupdate.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,update.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,download.windowsupdate.com,Microsoft",
    "DOMAIN-SUFFIX,delivery.mp.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,download.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,download.windows.com,Microsoft",
    "DOMAIN-SUFFIX,msftconnecttest.com,Microsoft",
    "DOMAIN-SUFFIX,msftncsi.com,Microsoft",
    "DOMAIN-SUFFIX,azure.com,Microsoft",
    "DOMAIN-SUFFIX,azure.net,Microsoft",
    "DOMAIN-SUFFIX,azureedge.net,Microsoft",
    "DOMAIN-SUFFIX,azurefd.net,Microsoft",
    "DOMAIN-SUFFIX,azurewebsites.net,Microsoft",
    "DOMAIN-SUFFIX,trafficmanager.net,Microsoft",
    "DOMAIN-SUFFIX,msedge.net,Microsoft",
    "DOMAIN-SUFFIX,msft.net,Microsoft",
    "DOMAIN-SUFFIX,msftstatic.com,Microsoft",
    "DOMAIN-SUFFIX,msecnd.net,Microsoft",
    "DOMAIN-SUFFIX,data.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,events.data.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,settings-win.data.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,v10.events.data.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,watson.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,watson.telemetry.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,telemetry.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,xbox.com,Microsoft",
    "DOMAIN-SUFFIX,xboxlive.com,Microsoft",
    "DOMAIN-SUFFIX,xboxlive.net,Microsoft",
    "DOMAIN-SUFFIX,xboxservices.com,Microsoft",
    "DOMAIN-SUFFIX,xboxab.com,Microsoft",
    "DOMAIN-SUFFIX,visualstudio.com,Microsoft",
    "DOMAIN-SUFFIX,visualstudio.microsoft.com,Microsoft",
    "DOMAIN-SUFFIX,vsassets.io,Microsoft",
    "DOMAIN-SUFFIX,vsblob.vsassets.io,Microsoft",
    "DOMAIN-SUFFIX,bing.com,Microsoft",
    "DOMAIN-SUFFIX,bing.net,Microsoft",
    "DOMAIN-SUFFIX,bingapis.com,Microsoft",
    "DOMAIN-SUFFIX,bingusercontent.com,Microsoft",
    "DOMAIN-SUFFIX,akamaized.net,Microsoft",
    "DOMAIN-SUFFIX,microsoft.com.akamaized.net,Microsoft",
    "DOMAIN-KEYWORD,microsoft,Microsoft",
    "DOMAIN-KEYWORD,windows,Microsoft",
    "DOMAIN-KEYWORD,office365,Microsoft",
    "DOMAIN-KEYWORD,officecdn,Microsoft",
    "DOMAIN-KEYWORD,onedrive,Microsoft",
    "DOMAIN-KEYWORD,outlook,Microsoft",
    "DOMAIN-KEYWORD,hotmail,Microsoft",
    "DOMAIN-KEYWORD,xbox,Microsoft",

    // Google
    "DOMAIN-KEYWORD,google,Google",
    "DOMAIN-SUFFIX,gmail.com,Google",
    "DOMAIN-SUFFIX,googleusercontent.com,Google",
    "DOMAIN-SUFFIX,gstatic.com,Google",
    "DOMAIN-SUFFIX,googleapis.com,Google",
    "DOMAIN-SUFFIX,googleusercontent.com,Google",
    "GEOSITE,google,Google",
    "GEOIP,google,Google,no-resolve",

    // X
    "DOMAIN-SUFFIX,x.com,X",
    "DOMAIN-SUFFIX,twitter.com,X",
    "DOMAIN-SUFFIX,t.co,X",
    "DOMAIN-SUFFIX,twimg.com,X",
    "GEOSITE,twitter,X",
    "GEOIP,twitter,X,no-resolve",

    // Facebook
    "DOMAIN-SUFFIX,facebook.com,Facebook",
    "DOMAIN-SUFFIX,facebook.net,Facebook",
    "DOMAIN-SUFFIX,fbcdn.net,Facebook",
    "DOMAIN-SUFFIX,fbsbx.com,Facebook",
    "DOMAIN-SUFFIX,fb.com,Facebook",
    "GEOSITE,facebook,Facebook",
    "GEOIP,facebook,Facebook,no-resolve",

    // Instagram
    "DOMAIN-SUFFIX,instagram.com,Instagram",
    "DOMAIN-SUFFIX,cdninstagram.com,Instagram",
    "DOMAIN-SUFFIX,instagram.net,Instagram",

    // WhatsApp
    "DOMAIN-SUFFIX,whatsapp.com,WhatsApp",
    "DOMAIN-SUFFIX,whatsapp.net,WhatsApp",
    "DOMAIN-SUFFIX,wa.me,WhatsApp",
    "DOMAIN-SUFFIX,whatsapp.org,WhatsApp",

    // Telegram
    "DOMAIN-SUFFIX,telegram.org,Telegram",
    "DOMAIN-SUFFIX,telegram.me,Telegram",
    "DOMAIN-SUFFIX,t.me,Telegram",
    "DOMAIN-SUFFIX,tdesktop.com,Telegram",
    "DOMAIN-SUFFIX,telegra.ph,Telegram",
    "DOMAIN-SUFFIX,telegram.dog,Telegram",
    "IP-CIDR,91.108.4.0/22,Telegram,no-resolve",
    "IP-CIDR,91.108.8.0/22,Telegram,no-resolve",
    "IP-CIDR,91.108.12.0/22,Telegram,no-resolve",
    "IP-CIDR,91.108.16.0/22,Telegram,no-resolve",
    "IP-CIDR,91.108.20.0/22,Telegram,no-resolve",
    "IP-CIDR,91.108.56.0/22,Telegram,no-resolve",
    "IP-CIDR,149.154.160.0/20,Telegram,no-resolve",
    "IP-CIDR6,2001:b28:f23d::/48,Telegram,no-resolve",
    "IP-CIDR6,2001:b28:f23f::/48,Telegram,no-resolve",
    "IP-CIDR6,2001:67c:4e8::/48,Telegram,no-resolve",
    "GEOSITE,telegram,Telegram",
    "GEOIP,telegram,Telegram,no-resolve",

    // Github
    "GEOSITE,github,Github",

    // Speedtest
    "GEOSITE,category-speedtest,Speedtest",
    "GEOSITE,category-speedtest@cn,Speedtest",
    "GEOSITE,category-speedtest@!cn,Speedtest",
    "GEOSITE,speedtest,Speedtest",

    // --- 非中国大陆区域 ---
    "GEOSITE,geolocation-!cn,PROXY-Gate",

    // --- 国内常用服务/域名直连 ---
    "GEOSITE,cn,DIRECT",
    "GEOIP,CN,DIRECT",

    // --- 兜底规则 ---
    "MATCH,PROXY-Gate"
  ];

// █████████████████████████████████████████████
// 五. Rule Providers (远程规则集)
// █████████████████████████████████████████████
  fixed["rule-providers"] = {
    "Privacy":                {"type": "http", "interval": 86400, "behavior": "classical", "format": "yaml", "url": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Privacy/Privacy.yaml"},
    "AdvertisingLite":        {"type": "http", "interval": 86400, "behavior": "classical", "format": "yaml", "url": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/AdvertisingLite/AdvertisingLite.yaml"},
    "Privacy_Domain":         {"type": "http", "interval": 86400, "behavior": "domain", "format": "mrs", "url": "https://raw.githubusercontent.com/kiki-rgb-00/kiki/refs/heads/main/MRS/Privacy_Domain.mrs"},
    "AdvertisingLite_Domain": {"type": "http", "interval": 86400, "behavior": "domain", "format": "mrs", "url": "https://raw.githubusercontent.com/kiki-rgb-00/kiki/refs/heads/main/MRS/AdvertisingLite_Domain.mrs"},
    "ACL4SSR_BanAD":          {"type": "http", "interval": 86400, "behavior": "domain", "format": "mrs", "url": "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/mrs/BanAD_domain.mrs"},
    "ACL4SSR_BanProgramAD":   {"type": "http", "interval": 86400, "behavior": "domain", "format": "mrs", "url": "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/mrs/BanProgramAD_domain.mrs"},
    "apple_domain":           {"type": "http", "interval": 86400, "behavior": "domain", "format": "mrs", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple.mrs"},
    "fakeipfilter_domain":    {"type": "http", "interval": 86400, "behavior": "domain", "format": "mrs", "url": "https://raw.githubusercontent.com/wwqgtxx/clash-rules/release/fakeip-filter.mrs"},
    "add_direct_domain":      {"type": "http", "interval": 86400, "behavior": "domain", "format": "mrs", "url": "https://raw.githubusercontent.com/Seven1echo/Yaml/refs/heads/main/rules/Seven1_Direct_Domain.mrs"},
    "cn_ip":                  {"type": "http", "interval": 86400, "behavior": "ipcidr", "format": "mrs", "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.mrs"}
  };

  return fixed;
}
