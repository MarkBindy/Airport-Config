/*
 * Clash / Mihomo 配置文件预处理脚本
 * URL: https://raw.githubusercontent.com/MarkBindy/Airport-Config/refs/heads/main/RewriteAUTO.js
 *
 * 包含：
 * 1. 完整的高级全局配置、TUN、Sniffer 以及分流 DNS 防泄漏设置
 * 2. 根据实际节点动态生成地区 Fallback 故障转移组（含自动检测与手动回退）、地区 Auto 自动组、地区 Manual 手动组
 * 3. 完整的 Rule-Providers 规则源与包含高级逻辑运算符（AND/NOT/OR）的精准 Rules
 * 4. APNs-Fallback
 * 5. Rules
 * 6. Rule Providers
 */

function main(config) {
  // Hako 当前选中的所有机场节点都会合并到 config.proxies。
  const currentProxies = Array.isArray(config && config.proxies)
    ? config.proxies
    : [];

  const currentProxyNames = currentProxies
    .map(p =>
      typeof p === "string"
        ? p
        : (p && typeof p.name === "string" ? p.name : null)
    )
    .filter(Boolean);

  // ============================================================
  // 1. 全局基础配置 / TUN / Sniffer / DNS 防泄漏
  // ============================================================

  const fixed = {
    "port": 7890,
    "socks-port": 7891,
    "redir-port": 7892,
    "mixed-port": 7893,
    "tproxy-port": 7895,
    "allow-lan": true,
    "bind-address": "*",
    "mode": "rule",
    "ipv6": true,
    "log-level": "info",
    "unified-delay": true,
    "tcp-concurrent": true,
    "keep-alive-idle": 600,
    "keep-alive-interval": 15,
    "global-ua": "clash",
    "geodata-loader": "memconservative",

    "profile": {
      "store-selected": true,
      "store-fake-ip": true
    },

    "experimental": {
      "quic-go-disable-gso": true,
      "quic-go-disable-ecn": true,
      "dialer-ip4p-convert": false
    },

    "tun": {
      "enable": true,
      "stack": "mips",
      "mtu": 1492,
      "dns-hijack": ["udp://any:53", "tcp://any:53"],
      "auto-route": true,
      "auto-redirect": true,
      "auto-detect-interface": true,
      "strict-route": true,
      "route-exclude-address": [
        "192.168.0.0/16",
        "10.0.0.0/8",
        "172.16.0.0/12"
      ],
      "exclude-interface": [
        "docker*",
        "podman*"
      ],
      "endpoint-independent-nat": true,
      "route-exclude-address-set": ["cn_ip"]
    },

    "sniffer": {
      "enable": true,
      "override-destination": true,
      "parse-pure-ip": true,
      "force-dns-mapping": true,
      "sniff": {
        "QUIC": { "ports": [443, 8443] },
        "TLS": { "ports": [443, 8443] },
        "HTTP": { "ports": [80, "8080-8880"] }
      },
      "force-domain": [
        "+.netflix.com",
        "+.nflxvideo.net",
        "+.amazonaws.com",
        "+.media.dssott.com",
        "+.tiktok.com"
      ],
      "skip-domain": [
        "Mijia Cloud",
        "dlg.io.mi.com",
        "+.oray.com",
        "+.sunlogin.net",
        "+.push.apple.com"
      ]
    },

    "dns": {
      "enable": true,
      "ipv6": false,
      "prefer-h3": true,
      "respect-rules": true,
      "use-hosts": true,
      "use-system-hosts": false,
      "cache-algorithm": "arc",
      "listen": "0.0.0.0:7874",
      "enhanced-mode": "fake-ip",
      "fake-ip-range": "198.18.0.1/16",
      "fake-ip-filter-mode": "blacklist",
      "fake-ip-filter": [
        "+.lan",
        "+.local",
        "+.localdomain",
        "localhost.ptlogin2.qq.com",
        "time.windows.com",
        "time.apple.com",
        "time.android.com",
        "+.googleapis.cn",
        "+.xn--ngstr-lra8j.com",
        "+.ntp.org.cn",
        "+.pool.ntp.org",
        "rule-set:fakeipfilter_domain",
        "rule-set:add_direct_domain",
        "geosite:cn"
      ],
      "default-nameserver": [
        "1.1.1.1",
        "8.8.8.8"
      ],
      "direct-nameserver": [
        "223.6.6.6",
        "223.5.5.5",
        "119.29.29.29",
        "https://dns.alidns.com/dns-query",
        "https://doh.pub/dns-query"
      ],
      "direct-nameserver-follow-policy": true,
      "proxy-server-nameserver": [
        "1.1.1.1",
        "8.8.8.8"
      ],
      "nameserver": [
        "https://1.1.1.1/dns-query",
        "https://1.0.0.1/dns-query",
        "https://8.8.8.8/dns-query",
        "https://8.8.4.4/dns-query",
        "https://dns.google/dns-query"
      ],
      "nameserver-policy": {
        "geosite:private,cn,apple-cn,apple,microsoft@cn,category-games@cn,steam@cn": [
          "223.6.6.6",
          "223.5.5.5",
          "119.29.29.29",
          "https://dns.alidns.com/dns-query",
          "https://doh.pub/dns-query"
        ],
        "+.cn": [
          "223.6.6.6",
          "223.5.5.5",
          "119.29.29.29",
          "https://dns.alidns.com/dns-query",
          "https://doh.pub/dns-query"
        ],
        "+.中国": [
          "223.6.6.6",
          "223.5.5.5",
          "119.29.29.29",
          "https://dns.alidns.com/dns-query",
          "https://doh.pub/dns-query"
        ],
        "+.公司": [
          "223.6.6.6",
          "223.5.5.5",
          "119.29.29.29",
          "https://dns.alidns.com/dns-query",
          "https://doh.pub/dns-query"
        ],
        "+.网络": [
          "223.6.6.6",
          "223.5.5.5",
          "119.29.29.29",
          "https://dns.alidns.com/dns-query",
          "https://doh.pub/dns-query"
        ],
        "+.google.com": [
          "https://1.1.1.1/dns-query",
          "https://dns.google/dns-query"
        ],
        "+.googleapis.com": [
          "https://1.1.1.1/dns-query",
          "https://dns.google/dns-query"
        ],
        "+.googleapis.cn": [
          "https://1.1.1.1/dns-query",
          "https://dns.google/dns-query"
        ],
        "+.gstatic.com": [
          "https://1.1.1.1/dns-query",
          "https://dns.google/dns-query"
        ],
        "+.gvt1.com": [
          "https://1.1.1.1/dns-query",
          "https://dns.google/dns-query"
        ],
        "+.gvt2.com": [
          "https://1.1.1.1/dns-query",
          "https://dns.google/dns-query"
        ],
        "+.gvt3.com": [
          "https://1.1.1.1/dns-query",
          "https://dns.google/dns-query"
        ],
        "+.googleusercontent.com": [
          "https://1.1.1.1/dns-query",
          "https://dns.google/dns-query"
        ],
        "+.ggpht.com": [
          "https://1.1.1.1/dns-query",
          "https://dns.google/dns-query"
        ],
        "+.android.com": [
          "https://1.1.1.1/dns-query",
          "https://dns.google/dns-query"
        ],
        "+.xn--ngstr-lra8j.com": [
          "https://1.1.1.1/dns-query",
          "https://dns.google/dns-query"
        ],
        "+.openai.com": [
          "https://1.1.1.1/dns-query",
          "https://dns.google/dns-query"
        ],
        "+.chatgpt.com": [
          "https://1.1.1.1/dns-query",
          "https://dns.google/dns-query"
        ],
        "+.anthropic.com": [
          "https://1.1.1.1/dns-query",
          "https://dns.google/dns-query"
        ],
        "+.claude.ai": [
          "https://1.1.1.1/dns-query",
          "https://dns.google/dns-query"
        ],
        "geosite:category-ai-!cn,geolocation-!cn": [
          "https://1.1.1.1/dns-query",
          "https://dns.google/dns-query"
        ]
      },
      "fallback": [
        "1.0.0.1",
        "8.8.4.4",
        "https://dns.cloudflare.com/dns-query",
        "https://1dot1dot1dot1.cloudflare-dns.com/"
      ],
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
        "ipcidr": [
          "240.0.0.0/4"
        ]
      }
    }
  };

  // ============================================================
  // 节点池
  // ============================================================

  fixed.proxies = currentProxies;
  fixed["proxy-groups"] = [];

  // ============================================================
  // 1. 主策略组（策略出站入口/代理网关/主选择组）
  // ============================================================

  fixed["proxy-groups"].push(
    {
      "name": "PROXY-Gate",
      "type": "select",
      "icon": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Final.png",
      "proxies": [
        "🌐 所有-手动",
        "DIRECT"
      ]
    },

    {
      "name": "Apple Push",
      "type": "fallback",
      "icon": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Apple.png",
      "proxies": [
        "APNs-Fallback",
        "DIRECT"
      ],
      "url": "http://captive.apple.com/hotspot-detect.html",
      "interval": 300
    },

    {
      "name": "🌐 所有-手动",
      "type": "select",
      "proxies": currentProxyNames.slice(),
      "icon": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Server.png"
    }
  );

  // ============================================================
  // 2. 普通服务策略组
  // ============================================================

  const serviceGroupNames = [
    "YouTube", "Netflix", "Disney+", "Spotify", "TikTok", "Twitch",
    "GPT", "Gemini", "Claude", "Copilot", "Grok", "Microsoft",
    "Google", "Apple", "X", "Facebook", "Instagram", "WhatsApp",
    "Telegram", "Github", "Speedtest"
  ];

  const serviceIcons = {
    "YouTube": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/YouTube.png",
    "Netflix": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Netflix.png",
    "Disney+": "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Disney+.png",
    "Spotify": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Spotify.png",
    "TikTok": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/TikTok.png",
    "Twitch": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Twitch.png",
    "GPT": "https://fastly.jsdelivr.net/gh/shindgewongxj/WHATSINStash/icon/openai.png",
    "Gemini": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/google-gemini.png",
    "Claude": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/anthropic.png",
    "Copilot": "https://fastly.jsdelivr.net/gh/Hawaiine/Oasisic-Icons@main/icons/Microsoft/Copilot-1.png",
    "Grok": "https://raw.githubusercontent.com/luestr/IconResource/main/App_icon/120px/Grok.png",
    "Microsoft": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Microsoft.png",
    "Google": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Google.png",
    "Apple": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Apple_2.png",
    "X": "https://fastly.jsdelivr.net/gh/shindgewongxj/WHATSINStash/icon/x.png",
    "Facebook": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Facebook.png",
    "Instagram": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Instagram.png",
    "WhatsApp": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/whatsapp.png",
    "Telegram": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Telegram.png",
    "Github": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/GitHub.png",
    "Speedtest": "https://cdn.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Speedtest.png"
  };

  serviceGroupNames.forEach(name => {
    fixed["proxy-groups"].push({
      "name": name,
      "type": "select",
      "icon": serviceIcons[name] || "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Server.png",
      "proxies": [
        "🌐 所有-手动",
        "PROXY-Gate",
        "DIRECT"
      ]
    });
  });

  // ============================================================
  // 3. 动态生成地区 Fallback 故障转移组（含地区自动组与无缝兼容手动切换/自动回退）、地区 Manual 手动组
  // ============================================================

  const regionGroups = [
    {key: "HK", name: "🇭🇰 香港", filter: /([\[]HK[\]]|^HK$|Hong[ _-]?Kong|\bHK\b|香港|🇭🇰)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"},
    {key: "TW", name: "🇹🇼 台湾", filter: /([\[]TW[\]]|^TW$|Taiwan|Taibei|Taipei|\bTW\b|台湾|臺灣|台北|高雄|🇹🇼)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"},
    {key: "JP", name: "🇯🇵 日本", filter: /([\[]JP[\]]|^JP$|Japan|\bJP\b|日本|东京|大阪|🇯🇵)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"},
    {key: "KR", name: "🇰🇷 韩国", filter: /([\[]KR[\]]|^KR$|Korea|South[ _-]?Korea|\bKR\b|韩国|韓國|首尔|首爾|🇰🇷)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"},
    {key: "RU", name: "🇷🇺 俄罗斯", filter: /([\[]RU[\]]|^RU$|Russia|Russian[ _-]?Federation|\bRU\b|俄罗斯|俄羅斯|莫斯科|伯力|🇷🇺)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"},
    {key: "SG", name: "🇸🇬 新加坡", filter: /([\[]SG[\]]|^SG$|Singapore|\bSG\b|新加坡|狮城|🇸🇬)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"},
    {key: "UK", name: "🇬🇧 英国", filter: /([\[]UK[\]]|^UK$|United[ _-]?Kingdom|Britain|England|\bUK\b|英国|英國|伦敦|🇬🇧)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"},
    {key: "DE", name: "🇩🇪 德国", filter: /([\[]DE[\]]|^DE$|Germany|Deutschland|\bDE\b|德国|德國|法兰克福|🇩🇪)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"},
    {key: "FR", name: "🇫🇷 法国", filter: /([\[]FR[\]]|^FR$|France|\bFR\b|法国|法國|巴黎|🇫🇷)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"},
    {key: "IT", name: "🇮🇹 意大利", filter: /([\[]IT[\]]|^IT$|Italy|Italian|\bIT\b|意大利|義大利|米兰|米蘭|罗马|羅馬|🇮🇹)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"},
    {key: "CA", name: "🇨🇦 加拿大", filter: /([\[]CA[\]]|^CA$|Canada|\bCA\b|加拿大|🇨🇦)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"},
    {key: "MY", name: "🇲🇾 马来西亚", filter: /([\[]MY[\]]|^MY$|Malaysia|Malaysian|\bMY\b|马来西亚|馬來西亞|吉隆坡|🇲🇾)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"},
    {key: "AU", name: "🇦🇺 澳大利亚", filter: /([\[]AU[\]]|^AU$|Australia|\bAU\b|澳大利亚|澳洲|澳大利亞|🇦🇺)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"},
    {key: "ES", name: "🇪🇸 西班牙", filter: /([\[]ES[\]]|^ES$|Spain|Spanish|\bES\b|西班牙|马德里|馬德里|🇪🇸)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"},
    {key: "NL", name: "🇳🇱 荷兰", filter: /([\[]NL[\]]|^NL$|Netherlands|Dutch|\bNL\b|荷兰|荷蘭|阿姆斯特丹|🇳🇱)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"},
    {key: "FI", name: "🇫🇮 芬兰", filter: /([\[]FI[\]]|^FI$|Finland|Finnish|\bFI\b|芬兰|芬蘭|赫尔辛基|赫爾辛基|🇫🇮)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"},
    {key: "NO", name: "🇳🇴 挪威", filter: /([\[]NO[\]]|^NO$|Norway|Norwegian|\bNO\b|挪威|奥斯陆|奧斯陸|🇳🇴)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"},
    {key: "SE", name: "🇸🇪 瑞典", filter: /([\[]SE[\]]|^SE$|Sweden|Swedish|\bSE\b|瑞典|斯德哥尔摩|斯德哥爾摩|🇸🇪)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"},
    {key: "CH", name: "🇨🇭 瑞士", filter: /([\[]CH[\]]|^CH$|Switzerland|Swiss|\bCH\b|瑞士|苏黎世|蘇黎世|日内瓦|日內瓦|🇨🇭)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"},
    {key: "PL", name: "🇵🇱 波兰", filter: /([\[]PL[\]]|^PL$|Poland|Polish|\bPL\b|波兰|波蘭|华沙|華沙|🇵🇱)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"},
    {key: "US", name: "🇺🇸 美国", filter: /([\[]US[\]]|^US$|USA|United[ _-]?States|\bUS\b|美国|美國|🇺🇸)/i, icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"}
  ];

  const existingRegionalFallbacks = [];
  const allRegionalGroupNames = [];

  regionGroups.forEach(region => {
    const matched = currentProxyNames.filter(
      name => region.filter.test(name)
    );

    const fallbackName = region.name + "-故转";
    const autoName = region.name + "-自动";
    const manualName = region.name + "-手动";

    if (matched.length === 0) {
      return;
    }

    // 1. 生成地区 Fallback 故障转移组（含地区自动组与无缝兼容手动切换/自动回退）
    // 将“手动选择组”放在第一位，后面跟该地区所有实际节点
    // 效果：优先使用手动选中的节点；若手动组断连或未选，自动测试并回退至该地区其他可用节点
    fixed["proxy-groups"].push({
      name: fallbackName,
      type: "fallback",
      proxies: [manualName, autoName],
      icon: region.icon,
      url: "http://www.gstatic.com/generate_204",
      interval: 300
    });

    // 2. 生成地区 Manual 手动选择组
    fixed["proxy-groups"].push({
      name: manualName,
      type: "select",
      proxies: matched,
      icon: region.icon
    });

    // 3. 生成地区 Auto 自动选择组
    fixed["proxy-groups"].push({
      name: autoName,
      type: "url-test",
      proxies: matched,
      icon: region.icon,
      url: "http://www.gstatic.com/generate_204",
      interval: 900,
      tolerance: 50
    });

    existingRegionalFallbacks.push(fallbackName);
    allRegionalGroupNames.push(fallbackName);  // 按顺序排列：故障转移 -> 手动
  });

  // ============================================================
  // 4. 将生成的地区组插入服务策略组
  // ============================================================

  const serviceProxyChoices = [
    "🌐 所有-手动",
    ...allRegionalGroupNames,
    "PROXY-Gate",
    "DIRECT"
  ];

  fixed["proxy-groups"].forEach(group => {
    if (serviceGroupNames.includes(group.name)) {
      group.proxies = serviceProxyChoices.slice();
    }
  });

  // ============================================================
  // 5. PROXY-Gate 选项更新
  // ============================================================

  const proxyGate = fixed["proxy-groups"].find(
    group => group.name === "PROXY-Gate"
  );

  if (proxyGate) {
    proxyGate.proxies = [
      "🌐 所有-手动",
      ...allRegionalGroupNames,
      "DIRECT"
    ];
  }

  // ============================================================
  // 6. Apple Push 专用 APNs-Fallback
  // ============================================================

  fixed["proxy-groups"].push({
    name: "APNs-Fallback",
    type: "fallback",
    proxies: existingRegionalFallbacks.length ? existingRegionalFallbacks : ["DIRECT"],
    icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Available_1.png",
    url: "http://captive.apple.com/hotspot-detect.html",
    interval: 300
  });
  
  // ============================================================
  // Rules
  // ============================================================

  fixed.rules = [
    "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
    "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
    "GEOIP,LAN,DIRECT,no-resolve",

    // Apple Push 必须在普通 Apple 规则之前
    "DOMAIN-SUFFIX,push.apple.com,Apple Push",
    "DOMAIN-SUFFIX,push-apple.com.akadns.net,Apple Push",
    "DOMAIN-KEYWORD,apple.com.edgekey.net,Apple Push",

    "IP-CIDR,17.249.0.0/16,Apple Push,no-resolve",
    "IP-CIDR,17.252.0.0/16,Apple Push,no-resolve",
    "IP-CIDR,17.57.144.0/22,Apple Push,no-resolve",
    "IP-CIDR,17.188.128.0/18,Apple Push,no-resolve",
    "IP-CIDR,17.188.20.0/23,Apple Push,no-resolve",

    "IP-CIDR6,2620:149:a44::/48,Apple Push,no-resolve",
    "IP-CIDR6,2403:300:a42::/48,Apple Push,no-resolve",
    "IP-CIDR6,2403:300:a51::/48,Apple Push,no-resolve",
    "IP-CIDR6,2a01:b740:a42::/48,Apple Push,no-resolve",

    // 普通 Apple 流量进入 Apple 策略组
    "RULE-SET,Apple,Apple",
    "RULE-SET,Apple_Domain,Apple",

    // 广告 / 隐私
    "RULE-SET,AdvertisingLite,REJECT",
    "RULE-SET,AdvertisingLite_Domain,REJECT",
    "RULE-SET,Privacy,REJECT",
    "RULE-SET,Privacy_Domain,REJECT",
    "RULE-SET,ACL4SSR_BanAD,REJECT",
    "RULE-SET,ACL4SSR_BanProgramAD,REJECT",

    // YouTube
    "DOMAIN-SUFFIX,youtube.com,YouTube",
    "DOMAIN-SUFFIX,youtu.be,YouTube",
    "DOMAIN-SUFFIX,youtube-nocookie.com,YouTube",
    "DOMAIN-SUFFIX,youtubei.googleapis.com,YouTube",
    "DOMAIN-SUFFIX,youtube.googleapis.com,YouTube",
    "DOMAIN-SUFFIX,ytimg.com,YouTube",
    "DOMAIN-SUFFIX,googlevideo.com,YouTube",
    "DOMAIN-SUFFIX,ggpht.com,YouTube",

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

    // Twitch
    "DOMAIN-SUFFIX,twitch.tv,Twitch",
    "DOMAIN-SUFFIX,twitchcdn.net,Twitch",
    "DOMAIN-SUFFIX,jtvnw.net,Twitch",
    "DOMAIN-SUFFIX,ttvnw.net,Twitch",
    "DOMAIN-SUFFIX,twitchsvc.net,Twitch",

    // GPT
    "DOMAIN-SUFFIX,chatgpt.com,GPT",
    "DOMAIN-SUFFIX,openai.com,GPT",
    "DOMAIN-SUFFIX,auth.openai.com,GPT",
    "DOMAIN-SUFFIX,oaistatic.com,GPT",
    "DOMAIN-SUFFIX,oaiusercontent.com,GPT",
    "DOMAIN,android.chat.openai.com,GPT",
    "DOMAIN,auth0.openai.com,GPT",
    "DOMAIN,chat.openai.com,GPT",
    "DOMAIN,desktop.chat.openai.com,GPT",
    "DOMAIN,ios.chat.openai.com,GPT",
    "DOMAIN,tcr9i.chat.openai.com,GPT",
    "DOMAIN,cdn.openaimerge.com,GPT",
    "DOMAIN,ws.chatgpt.com,GPT",
    "DOMAIN,setup.auth.openai.com,GPT",
    "DOMAIN,cdn.workos.com,GPT",
    "DOMAIN,forwarder.workos.com,GPT",
    "DOMAIN,images.workoscdn.com,GPT",
    "DOMAIN,workos.imgix.net,GPT",
    "DOMAIN,setup.workos.com,GPT",
    "DOMAIN,ct.sendgrid.net,GPT",
    "DOMAIN,oaistatsig.com,GPT",
    "DOMAIN,intercom.io,GPT",
    "DOMAIN,intercomcdn.com,GPT",
    "DOMAIN,js.intercomcdn.com,GPT",
    "DOMAIN,js.stripe.com,GPT",
    "DOMAIN,o207216.ingest.sentry.io,GPT",
    "DOMAIN,o33249.ingest.sentry.io,GPT",
    "DOMAIN,rum.browser-intake-datadoghq.com,GPT",
    "DOMAIN,challenges.cloudflare.com,GPT",
    "DOMAIN,humb.apple.com,GPT",

    // Gemini
    "DOMAIN-SUFFIX,gemini.google.com,Gemini",
    "DOMAIN-SUFFIX,aistudio.google.com,Gemini",
    "DOMAIN-SUFFIX,deepmind.com,Gemini",
    "DOMAIN-SUFFIX,deepmind.google,Gemini",
    "DOMAIN-SUFFIX,gemini.googleusercontent.com,Gemini",
    "DOMAIN-SUFFIX,makersuite.google.com,Gemini",

    // Claude
    "DOMAIN-SUFFIX,claude.ai,Claude",
    "DOMAIN-SUFFIX,anthropic.com,Claude",
    "DOMAIN-SUFFIX,claudeusercontent.com,Claude",
    "DOMAIN-SUFFIX,claudeusercontent.com.cdn.cloudflare.net,Claude",

    // Copilot
    "DOMAIN-SUFFIX,copilot.microsoft.com,Copilot",
    "DOMAIN-SUFFIX,ai.microsoft.com,Copilot",
    "DOMAIN-SUFFIX,designer.microsoft.com,Copilot",
    "DOMAIN-SUFFIX,copilot.com,Copilot",
    "DOMAIN-KEYWORD,copilot,Copilot",

    // Grok
    "DOMAIN-SUFFIX,grok.com,Grok",
    "DOMAIN-SUFFIX,x.ai,Grok",
    "DOMAIN-KEYWORD,grok,Grok",

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

    // X
    "DOMAIN-SUFFIX,x.com,X",
    "DOMAIN-SUFFIX,twitter.com,X",
    "DOMAIN-SUFFIX,t.co,X",
    "DOMAIN-SUFFIX,twimg.com,X",

    // Facebook
    "DOMAIN-SUFFIX,facebook.com,Facebook",
    "DOMAIN-SUFFIX,facebook.net,Facebook",
    "DOMAIN-SUFFIX,fbcdn.net,Facebook",
    "DOMAIN-SUFFIX,fbsbx.com,Facebook",
    "DOMAIN-SUFFIX,fb.com,Facebook",

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

    // Github
    "DOMAIN-SUFFIX,github.com,Github",
    "DOMAIN-SUFFIX,githubusercontent.com,Github",
    "DOMAIN-SUFFIX,githubassets.com,Github",
    "DOMAIN-SUFFIX,raw.githubusercontent.com,Github",
    "DOMAIN-SUFFIX,github.io,Github",
    "DOMAIN-SUFFIX,github.dev,Github",
    "DOMAIN-SUFFIX,githubstatus.com,Github",

    // Speedtest
    "DOMAIN-SUFFIX,speedtest.net,Speedtest",
    "DOMAIN-SUFFIX,speedtest.com,Speedtest",
    "DOMAIN-SUFFIX,ookla.com,Speedtest",
    "DOMAIN-SUFFIX,ooklaserver.net,Speedtest",
    "DOMAIN-SUFFIX,ookla.net,Speedtest",
    "DOMAIN-SUFFIX,speedtestcustom.com,Speedtest",

    // 中国大陆
    "RULE-SET,ChinaMax,DIRECT",
    "RULE-SET,ChinaMax_Domain,DIRECT",
    "RULE-SET,ChinaMax_IP,DIRECT",
    "GEOSITE,CN,DIRECT",
    "GEOIP,CN,DIRECT,no-resolve",

    // 最终兜底
    "MATCH,PROXY-Gate"
  ];

  // ============================================================
  // Rule Providers
  // ============================================================

  fixed["rule-providers"] = {
    "Apple": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "interval": 86400,
      "url": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Apple/Apple.yaml"
    },

    "Apple_Domain": {
      "type": "http",
      "behavior": "domain",
      "format": "mrs",
      "interval": 86400,
      "url": "https://raw.githubusercontent.com/kiki-rgb-00/kiki/refs/heads/main/MRS/Apple_Domain.mrs"
    },

    "AdvertisingLite": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "interval": 86400,
      "url": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/AdvertisingLite/AdvertisingLite.yaml"
    },

    "AdvertisingLite_Domain": {
      "type": "http",
      "behavior": "domain",
      "format": "mrs",
      "interval": 86400,
      "url": "https://raw.githubusercontent.com/kiki-rgb-00/kiki/refs/heads/main/MRS/AdvertisingLite_Domain.mrs"
    },

    "Privacy": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "interval": 86400,
      "url": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Privacy/Privacy.yaml"
    },

    "Privacy_Domain": {
      "type": "http",
      "behavior": "domain",
      "format": "mrs",
      "interval": 86400,
      "url": "https://raw.githubusercontent.com/kiki-rgb-00/kiki/refs/heads/main/MRS/Privacy_Domain.mrs"
    },

    "ACL4SSR_BanAD": {
      "type": "http",
      "behavior": "domain",
      "format": "mrs",
      "interval": 86400,
      "url": "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/mrs/BanAD_domain.mrs"
    },

    "ACL4SSR_BanProgramAD": {
      "type": "http",
      "behavior": "domain",
      "format": "mrs",
      "interval": 86400,
      "url": "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/mrs/BanProgramAD_domain.mrs"
    },

    "ChinaMax": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "interval": 86400,
      "url": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/ChinaMax/ChinaMax.yaml"
    },

    "ChinaMax_Domain": {
      "type": "http",
      "behavior": "domain",
      "format": "mrs",
      "interval": 86400,
      "url": "https://raw.githubusercontent.com/kiki-rgb-00/kiki/refs/heads/main/MRS/ChinaMax_Domain.mrs"
    },

    "fakeipfilter_domain": { 
      "type": "http",
      "behavior": "domain",
      "format": "mrs",
      "interval": 86400,
      "url": "https://raw.githubusercontent.com/wwqgtxx/clash-rules/release/fakeip-filter.mrs"
    },
 
    "add_direct_domain": { 
      "type": "http",
      "behavior": "domain",
      "format": "mrs",
      "interval": 86400,
      "url": "https://raw.githubusercontent.com/Seven1echo/Yaml/refs/heads/main/rules/Seven1_Direct_Domain.mrs"
    },

    "ChinaMax_IP": {
      "type": "http",
      "behavior": "ipcidr",
      "format": "mrs",
      "interval": 86400,
      "url": "https://raw.githubusercontent.com/kiki-rgb-00/kiki/refs/heads/main/MRS/ChinaMax_IP.mrs"
    }
  };

  return fixed;
}
