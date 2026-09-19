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
      "name": "PROXY-Gate",
      "type": "select",
      "icon": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Final.png",
      "proxies": [
        "🖥️ All-Nodes",
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
      "name": "🖥️ All-Nodes",
      "type": "select",
      "proxies": currentProxyNames.slice(),
      "icon": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Server.png"
    }
  );

  // ============================================================
  // 2. 普通服务策略组
  //
  // 这里暂时只放 All-Nodes / PROXY-Gate / DIRECT。
  // 后面检测完节点地区后，再把实际存在的 Auto 组插入。
  //
  // 因此：
  // 没有法国节点 → 不会出现 FR-Auto
  // 没有俄罗斯节点 → 不会出现 RU-Auto
  // ============================================================

  fixed["proxy-groups"].push({
    "name": "YouTube",
    "type": "select",
    "icon": "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/YouTube.png",
    "proxies": [
      "🖥️ All-Nodes",
      "PROXY-Gate",
      "DIRECT"
    ]
  });

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
      name: "🇭🇰 HK",
      filter: /([\[]HK[\]]|^HK$|Hong[ _-]?Kong|\bHK\b|香港|🇭🇰)/i,
      icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png"
    }
  ];

  const existingRegionalAutos = [];

  regionGroups.forEach(region => {
    const matched = currentProxyNames.filter(
      name => region.filter.test(name)
    );

    const autoName = region.name + "-Auto";

    // 只有 3 个及以上节点才生成该地区 Auto。
    if (matched.length < 3) {
      return;
    }

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
  //
  // 顺序固定为：
  //
  // 🖥️ All-Nodes
  // 🌍 Global-Fallback
  // 🇺🇸 US-Auto
  // 🇸🇬 SG-Auto
  // ...
  // PROXY-Gate
  // DIRECT
  //
  // Global-Fallback 是用户主动选择的跨地区容灾模式。
  // ============================================================

  const serviceProxyChoices = [
    "🖥️ All-Nodes",
    ...(existingRegionalAutos.length
      ? ["🌍 Global-Fallback"]
      : []),
    ...existingRegionalAutos,
    "PROXY-Gate",
    "DIRECT"
  ];

  const serviceGroupNames = [
    "YouTube",
    "Speedtest"
  ];

  fixed["proxy-groups"].forEach(group => {
    if (serviceGroupNames.includes(group.name)) {
      group.proxies = serviceProxyChoices.slice();
    }
  });

  // ============================================================
  // 5. PROXY-Gate
  //
  // 顺序固定为：
  //
  // 🖥️ All-Nodes
  // 🌍 Global-Fallback
  // 🇺🇸 US-Auto
  // 🇸🇬 SG-Auto
  // ...
  // DIRECT
  //
  // Global-Fallback 同样只是一个可手动选择的出口。
  // ============================================================

  const proxyGate = fixed["proxy-groups"].find(
    group => group.name === "PROXY-Gate"
  );

  if (proxyGate) {
    proxyGate.proxies = [
      "🖥️ All-Nodes",
      ...(existingRegionalAutos.length
        ? ["🌍 Global-Fallback"]
        : []),
      ...existingRegionalAutos,
      "DIRECT"
    ];
  }

  // ============================================================
  // 6. Apple Push 专用 APNs-Fallback
  //
  // 只引用实际生成的地区 Auto。
  //
  // 少于 3 个节点的地区不会出现在这里。
  // ============================================================

  fixed["proxy-groups"].push({
    name: "APNs-Fallback",
    type: "fallback",
    proxies: existingRegionalAutos,
    icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Available_1.png",
    url: "http://captive.apple.com/hotspot-detect.html",
    interval: 300
  });

  // ============================================================
  // 7. Global-Fallback
  //
  // 放在整个策略组列表最后，与 APNs-Fallback 相邻。
  //
  // 它引用地区 Auto，而不是直接引用原始节点。
  //
  // 因此逻辑为：
  //
  // 地区内部：
  //     US-Auto → 自动选择 US 地区可用节点
  //
  // 地区之间：
  //     US-Auto → SG-Auto → HK-Auto → ...
  //
  // 只有用户主动选择 🌍 Global-Fallback 时才启用。
  // ============================================================

  if (existingRegionalAutos.length) {
    fixed["proxy-groups"].push({
      name: "🌍 Global-Fallback",
      type: "fallback",
      proxies: existingRegionalAutos,
      icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Available_1.png",
      url: "http://www.gstatic.com/generate_204",
      interval: 600
    });
  }

  // ============================================================
  // Rules
  // ============================================================

  fixed.rules = [
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
    }
  };

  return fixed;
}
