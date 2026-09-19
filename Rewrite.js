/* 
 * 地址: https://raw.githubusercontent.com/MarkBindy/Airport-Config/refs/heads/main/Rewrite.js
 * 服务分类配置｜测试版(mips)
 *
 * Hako 会将当前选中的多个节点来源合并到 config.proxies。Runestone_V1
 * 本脚本不依赖任何 proxy-providers 名称。
 *
 * 结构：
 * 1. 主策略组
 * 2. 普通服务策略组
 * 3. 根据实际节点动态生成地区 Auto
 * 4. APNs-Fallback
 * 5. Global-Fallback
 * 6. Rules
 * 7. Rule Providers
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

  const fixed = {
    "mixed-port": 7890,
    "allow-lan": false,
    "bind-address": "*",
    "mode": "rule",
    "log-level": "info",
    "external-controller": "127.0.0.1:9090",
    "unified-delay": true,
    "tcp-concurrent": true,
    "ipv6": true,

    "tun": {
      "enable": true,
      "stack": "mips",
      "auto-route": true,
      "auto-detect-interface": true,
      "strict-route": true,
      "dns-hijack": [
        "any:53"
      ]
    },

    "dns": {
      "enable": true,
      "respect-rules": true,
      "ipv6": true,
      "prefer-h3": false,
      "enhanced-mode": "fake-ip",
      "fake-ip-range": "198.18.0.1/16",

      "default-nameserver": [
        "1.1.1.1",
        "8.8.8.8",
      ],

      "nameserver": [
        "https://1.1.1.1/dns-query",
        "https://1.0.0.1/dns-query",
        "https://8.8.8.8/dns-query",
        "https://8.8.4.4/dns-query",
        "https://dns.google/dns-query"
      ],

      "proxy-server-nameserver-policy": null,

      "proxy-server-nameserver": [
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

      "nameserver-policy": {
        "dns.cloudflare.com": [
          "1.1.1.1",
          "1.0.0.1"
        ],

        "dns.google": [
          "8.8.8.8",
          "8.8.4.4"
        ],

        "dns.quad9.net": [
          "9.9.9.9",
          "149.112.112.112"
        ],

        "dns.alidns.com": [
          "223.5.5.5",
          "223.6.6.6"
        ],

        "doh.pub": [
          "1.12.12.12",
          "120.53.53.53"
        ],

        "geosite:cn": [
          "https://dns.alidns.com/dns-query",
          "https://doh.pub/dns-query"
        ]
      },

      "fallback": [
        "1.0.0.1",
        "8.8.4.4",
        "https://dns.cloudflare.com/dns-query",
        "https://1dot1dot1dot1.cloudflare-dns.com/",
        "https://anycast.uncensoreddns.org/dns-query"
      ],

      "fallback-filter": {
        "geoip": true,
        "geoip-code": "CN",
        "ipcidr": [
          "240.0.0.0/4",
          "127.0.0.0/8",
          "0.0.0.0/32"
        ]
      },

      "fake-ip-filter": [
        "*.lan",
        "*.local",
        "localhost",
        "+.localdomain",
        "*.msftconnecttest.com",
        "*.msftncsi.com",
        "*.msidentity.com",
        "captive.apple.com",
        "*.push.apple.com",
        "time.windows.com",
        "time.apple.com",
        "+.googleapis.cn",
        "+.ntp.org.cn",
        "+.pool.ntp.org",
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
        "speedtest.net",
        "geosite:cn"
      ]
    },

    "profile": {
      "store-selected": true,
      "store-fake-ip": true
    }
  };

  // ============================================================
  // 节点池
  // ============================================================

  fixed.proxies = currentProxies;
  fixed["proxy-groups"] = [];

  // ============================================================
  // 1. 主策略组
  //
  // Auto 组故意不在这里生成。
  // Auto 会在所有普通服务策略组之后生成。
  // ============================================================

  fixed["proxy-groups"].push(
    {
      "name": "YouTube",
      "type": "select",
      "icon": "https://github.com/MarkBindy/Airport-Config/raw/main/icon/qure/color/YouTube.png",
      "proxies": [
        "🇭🇰 香港-故转",
        "🇹🇼 台湾-故转",
        "🇯🇵 日本-故转",
        "🇰🇷 韩国-故转",
        "🇸🇬 狮城-故转",
        "🇬🇧 英国-故转",
        "🇺🇸 美国-故转",
        "♻️ 其他-故转",
        "🌐 全部-手动",
        "DIRECT"
      ]
    },
        
    {
      "name": "🌐 全部-手动",
      "type": "select",
      "empty-fallback": "REJECT",
      "proxies": currentProxyNames.slice()
    }
  );

  // ============================================================
  // 3. 地区 Auto
  //
  // 直接读取 Hako 合并后的完整 config.proxies。
  //
  // 只有匹配到 3 个及以上节点才生成对应地区 Auto。
  //
  // 少于 3 个：
  // - 不生成 Auto
  // - 不加入服务策略组
  // - 不加入 APNs-Fallback
  //
  // 所有 Auto 组统一使用 Auto.png 图标。
  // ============================================================

  const regionGroups = [
    {
      key: "HK",
      name: "🇭🇰 香港",
      filter: /([\[]HK[\]]|^HK$|Hong[ _-]?Kong|\bHK\b|香港|🇭🇰)/i
    }
  ];

  const existingRegionalAutos = [];

  regionGroups.forEach(region => {
    const matched = currentProxyNames.filter(
      name => region.filter.test(name)
    );

    const autoName = region.name + "-自动";

    fixed["proxy-groups"].push({
      name: autoName,
      type: "url-test",
      proxies: matched,
      icon: region.icon,
      url: "http://www.gstatic.com/generate_204",
      interval: 900,
      tolerance: 50
    });

    // 这里只记录实际生成的 Auto。
    // 后续服务策略组和 APNs-Fallback 都只引用这个数组。
    existingRegionalAutos.push(autoName);
  });

  // ============================================================
  // 4. 将实际存在的 Auto 组加入服务策略组

  const serviceProxyChoices = [
    ...(existingRegionalAutos.length
      ? []
      : []),
    ...existingRegionalAutos,
    "🌐 全部-手动",
    "DIRECT"
  ];

  const serviceGroupNames = [
    "YouTube"
  ];

  fixed["proxy-groups"].forEach(group => {
    if (serviceGroupNames.includes(group.name)) {
      group.proxies = serviceProxyChoices.slice();
    }
  });

  // ============================================================

  fixed["proxy-groups"].push({
    name: "🇭🇰 香港-故转",
    type: "fallback",
    proxies: [
      "🇭🇰 香港-自动",
      "🌐 全部-手动",
    ],
    interval: 300
  });

  // ============================================================
  // Rules
  // ============================================================

  fixed.rules = [
    "GEOSITE,youtube,YouTube",
    "GEOSITE,CN,DIRECT",
    "GEOIP,CN,DIRECT,no-resolve",

    // 最终兜底
    "MATCH,YouTube"
  ];

  // ============================================================
  // Rule Providers
  // ============================================================

  return fixed;
}
