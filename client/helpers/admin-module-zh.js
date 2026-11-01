import _ from 'lodash'

const moduleTranslations = {
  analytics: {
    azureinsights: {
      title: 'Azure Application Insights',
      description: '用于网页、桌面及移动应用的应用程序性能监控服务。'
    },
    baidutongji: {
      title: '百度统计',
      description: '百度提供的网站流量统计与分析服务。'
    },
    baiduTongji: {
      title: '百度统计',
      description: '百度提供的网站流量统计与分析服务。'
    },
    countly: {
      title: 'Countly 分析',
      description: '用于深入了解并改善网页、桌面和移动应用客户旅程的分析平台。',
      props: {
        appKey: {
          title: '应用密钥',
          hint: '可在“管理 > 应用”中找到应用密钥'
        },
        serverUrl: {
          title: '服务器地址',
          hint: '用于上报数据的 Countly 服务器地址，例如 https://us-example.count.ly'
        }
      }
    },
    elasticapm: {
      title: 'Elastic APM RUM',
      description: '在浏览器等客户端采集真实用户交互数据。'
    },
    fathom: {
      title: 'Fathom',
      description: '简单实用的网站流量分析工具，不跟踪或存储访客个人数据。'
    },
    fullstory: {
      title: 'FullStory',
      description: '数字体验分析平台，支持会话回放、热图及行为分析。'
    },
    google: {
      title: 'Google Analytics',
      description: 'Google 提供的网站流量统计与分析服务。',
      props: {
        propertyTrackingId: {
          title: '媒体资源跟踪 ID',
          hint: 'G-XXXXXXXXXX'
        }
      }
    },
    gtm: {
      title: 'Google Tag Manager',
      description: 'Google 提供的标签管理系统，用于管理跟踪与分析脚本。'
    },
    hotjar: {
      title: 'Hotjar',
      description: '网站行为分析与用户反馈工具。'
    },
    matomo: {
      title: 'Matomo',
      description: '注重隐私的开源网站分析平台。'
    },
    newrelic: {
      title: 'New Relic Browser',
      description: '深入了解访客与应用或网站交互情况的浏览器监控服务。'
    },
    plausible: {
      title: 'Plausible Analytics',
      description: '简洁、开源、轻量且注重隐私的网站分析服务。'
    },
    statcounter: {
      title: 'StatCounter',
      description: '查看访客行为并分析网站流量趋势的统计服务。'
    },
    umami: {
      title: 'Umami Analytics v1',
      description: '简单、快速且注重隐私的开源网站分析工具。'
    },
    umami2: {
      title: 'Umami Analytics v2',
      description: '简单、快速且注重隐私的开源网站分析工具。'
    },
    yandex: {
      title: 'Yandex Metrica',
      description: 'Yandex 提供的网站流量与用户行为分析服务。'
    }
  },
  comments: {
    artalk: {
      title: 'Artalk',
      description: '轻量级自托管评论系统。',
      props: {
        server: {
          title: 'Artalk 后端地址',
          hint: '可公开访问的 Artalk 实例地址，需以 http/https 开头并去掉末尾斜杠，例如 https://artalk.example.com'
        },
        siteName: {
          title: '站点名称',
          hint: 'Artalk 后端中配置的站点名称。留空则使用默认站点。'
        }
      }
    },
    commento: {
      title: 'Commento',
      description: '注重隐私的轻量级自托管评论系统。'
    },
    default: {
      title: '内置评论',
      description: '由 Wiki 自身提供的评论功能。'
    },
    disqus: {
      title: 'Disqus',
      description: 'Disqus 是一个广泛使用的在线评论平台。',
      props: {
        accountName: {
          title: '短站点名',
          hint: 'Disqus 中用于标识网站的唯一定位名'
        }
      }
    }
  },
  rendering: {
    htmlAsciinema: {
      title: 'Asciinema 播放器',
      description: '从兼容链接嵌入 Asciinema 播放器'
    },
    htmlBlockquotes: {
      title: '引用块',
      description: '渲染引用框样式'
    },
    htmlCodehighlighter: {
      title: '代码高亮后处理器',
      description: '自动识别并高亮编程代码'
    },
    htmlCore: {
      title: '核心',
      description: '基础 HTML 解析器',
      props: {
        absoluteLinks: {
          title: '将相对链接视为站点根路径',
          hint: '例如页面 xyz 中的 foo/bar 链接会渲染为 /foo/bar，而不是 /xyz/foo/bar。'
        },
        openExternalLinkNewTab: {
          title: '在新标签页中打开外部链接',
          hint: '自动为外部链接添加 _blank 目标属性。'
        },
        relAttributeExternalLink: {
          title: '保护使用新标签页打开的外部链接',
          hint: '为使用 _blank 目标的外部链接添加 rel 属性，以降低 XSS 风险。'
        }
      }
    },
    htmlDiagram: {
      title: '图表后处理器',
      description: '处理 draw.io 图表'
    },
    htmlImagePrefetch: {
      title: '图片预取',
      description: '预取远程渲染的图片（Kroki / PlantUML）'
    },
    htmlMediaplayers: {
      title: '媒体播放器',
      description: '嵌入 YouTube、Vimeo、SoundCloud 等播放器'
    },
    htmlMermaid: {
      title: 'Mermaid',
      description: '根据 Mermaid 语法生成流程图'
    },
    htmlSecurity: {
      title: '安全',
      description: '过滤并移除可能存在危险的内容',
      props: {
        safeHTML: {
          title: '净化 HTML',
          hint: '移除可能导致 XSS 攻击的不安全属性和标签。'
        },
        allowDrawIoUnsafe: {
          title: '允许 Draw.io 中的非安全元素',
          hint: '打开此项可保留通常会被过滤的 Draw.io 元素，关闭后部分图表可能被完全移除。'
        },
        allowIFrames: {
          title: '允许 iframe',
          hint: '启用后不会移除 iframe，不建议开启。'
        }
      }
    },
    htmlTabset: {
      title: '标签页',
      description: '将标题转换为标签页'
    },
    htmlTwemoji: {
      title: 'Twitter Emoji',
      description: '将 Unicode 表情转换为 Twitter Emoji'
    },
    markdownAbbr: {
      title: '缩写',
      description: '将缩写解析为 abbr 标签'
    },
    asciiDocCore: {
      title: '核心',
      description: '基础 AsciiDoc 解析器'
    },
    markdownCore: {
      title: '核心',
      description: '基础 Markdown 解析器',
      props: {
        allowHTML: {
          title: '允许 HTML',
          hint: '允许在内容中使用 HTML 标签。'
        },
        linkify: {
          title: '自动转换链接',
          hint: '自动将链接转换为可点击链接。'
        },
        linebreaks: {
          title: '自动转换换行',
          hint: '在段落中添加换行。'
        },
        underline: {
          title: '下划线强调',
          hint: '允许使用 _下划线_ 语法为文本添加下划线。'
        },
        typographer: {
          title: '智能排版',
          hint: '启用与语言无关的替换规则和引号美化。'
        },
        quotes: {
          title: '引号样式',
          hint: '启用智能排版后，可设置双引号和单引号的替换样式。'
        }
      },
      enum: {
        Chinese: '中文',
        English: '英文',
        French: '法文',
        German: '德文',
        Greek: '希腊文',
        Japanese: '日文',
        Hungarian: '匈牙利文',
        Polish: '波兰文',
        Portuguese: '葡萄牙文',
        Russian: '俄文',
        Spanish: '西班牙文',
        Swedish: '瑞典文'
      }
    },
    markdownEmoji: {
      title: '表情符号',
      description: '将标签转换为表情符号'
    },
    markdownExpandtabs: {
      title: '展开制表符',
      description: '将代码块中的制表符替换为空格',
      props: {
        tabWidth: {
          title: '制表符宽度',
          hint: '每个制表符对应的空格数量'
        }
      }
    },
    markdownFootnotes: {
      title: '脚注',
      description: '解析脚注引用'
    },
    markdownImsize: {
      title: '图片尺寸',
      description: '为图片添加尺寸属性'
    },
    markdownKatex: {
      title: 'KaTeX',
      description: 'LaTeX 数学与化学表达式排版渲染器',
      props: {
        useInline: {
          title: '行内 TeX',
          hint: '处理由 $ 符号包围的行内 TeX 表达式。'
        },
        useBlocks: {
          title: 'TeX 区块',
          hint: '处理由 $$ 符号包围的 TeX 区块。'
        }
      }
    },
    markdownKroki: {
      title: 'Kroki',
      description: 'Kroki 图表解析器',
      props: {
        server: {
          title: 'Kroki 服务器',
          hint: '用于生成图片的 Kroki 服务器'
        },
        openMarker: {
          title: '开始标记',
          hint: '用作起始分隔符的文本。图表类型需位于下一行并使用小写。'
        },
        closeMarker: {
          title: '结束标记',
          hint: '用作结束分隔符的文本'
        }
      }
    },
    markdownMathjax: {
      title: 'MathJax',
      description: 'LaTeX 数学与化学表达式排版渲染器'
    },
    markdownMultiTable: {
      title: 'MultiMarkdown 表格',
      description: '添加 MultiMarkdown 表格支持',
      props: {
        multilineEnabled: {
          title: '多行',
          hint: '允许表格行包含多行内容'
        },
        headerlessEnabled: {
          title: '无表头',
          hint: '允许省略表格表头'
        },
        rowspanEnabled: {
          title: '跨行合并',
          hint: '允许表格行跨行合并'
        }
      }
    },
    markdownPivotTable: {
      title: '透视表',
      description: '添加透视表支持'
    },
    markdownPlantuml: {
      title: 'PlantUML',
      description: 'PlantUML Markdown 解析器',
      props: {
        server: {
          title: 'PlantUML 服务器',
          hint: '用于生成图片的 PlantUML 服务器'
        },
        openMarker: {
          title: '开始标记',
          hint: '用作起始分隔符的文本'
        },
        closeMarker: {
          title: '结束标记',
          hint: '用作结束分隔符的文本'
        },
        imageFormat: {
          title: '图片格式',
          hint: 'PlantUML 渲染图片使用的格式'
        }
      }
    },
    markdownSupsub: {
      title: '下标 / 上标',
      description: '解析下标和上标标签',
      props: {
        subEnabled: {
          title: '下标',
          hint: '启用下标标签'
        },
        supEnabled: {
          title: '上标',
          hint: '启用上标标签'
        }
      }
    },
    markdownTasklists: {
      title: '任务列表',
      description: '将任务列表解析为复选框'
    },
    openapiCore: {
      title: '核心',
      description: '基础 OpenAPI 渲染器'
    }
  },
  search: {
    algolia: {
      title: 'Algolia',
      description: '基于 API 的搜索即服务平台。',
      props: {
        appId: {
          title: '应用 ID',
          hint: '可在“API 密钥”中找到 Algolia 应用 ID'
        },
        apiKey: {
          title: '管理 API 密钥',
          hint: '可在“API 密钥”中找到 Algolia 管理 API 密钥'
        },
        indexName: {
          title: '索引名称',
          hint: '在“索引”中创建的索引名称'
        }
      }
    },
    aws: {
      title: 'Amazon OpenSearch',
      description: 'Amazon OpenSearch 搜索服务。'
    },
    azure: {
      title: 'Azure AI Search',
      description: 'Microsoft Azure 提供的搜索服务。'
    },
    db: {
      title: '数据库 - 基础',
      description: '默认的数据库基础搜索方式。'
    },
    elasticsearch: {
      title: 'Elasticsearch',
      description: '分布式全文搜索与分析引擎。'
    },
    manticore: {
      title: 'Manticore Search',
      description: '开源全文搜索与索引引擎。'
    },
    postgres: {
      title: 'PostgreSQL 全文搜索',
      description: '使用 PostgreSQL 内置的全文搜索功能。'
    },
    solr: {
      title: 'Apache Solr',
      description: 'Apache 全文搜索平台。'
    },
    sphinx: {
      title: 'Sphinx',
      description: '开源全文搜索服务器。'
    }
  },
  storage: {
    azure: {
      title: 'Azure Blob 存储',
      description: '使用 Microsoft Azure Blob 存储文件。'
    },
    box: {
      title: 'Box',
      description: '使用 Box 云存储文件。'
    },
    digitalocean: {
      title: 'DigitalOcean Spaces',
      description: '使用 DigitalOcean Spaces 存储文件。'
    },
    disk: {
      title: '本地文件系统',
      description: '使用本地磁盘或网络共享存储文件。',
      props: {
        path: {
          title: '路径',
          hint: '绝对路径，末尾不带斜杠，例如 /home/wiki/backup 或 C:\\wiki\\backup'
        },
        createDailyBackups: {
          title: '创建每日备份',
          hint: '每天在 _daily 子目录中创建包含全部内容的 tar.gz 归档，归档保留一个月。'
        }
      },
      actions: {
        dump: {
          label: '将所有内容写入磁盘',
          hint: '将数据库中的全部内容导出到本地磁盘。'
        },
        backup: {
          label: '创建备份',
          hint: '在 _manual 子目录中创建当前磁盘内容的手动备份归档。'
        },
        importAll: {
          label: '导入全部内容',
          hint: '导入本地磁盘目录中的所有内容。'
        }
      }
    },
    dropbox: {
      title: 'Dropbox',
      description: '使用 Dropbox 云存储文件。'
    },
    gdrive: {
      title: 'Google Drive',
      description: '使用 Google Drive 存储文件。'
    },
    git: {
      title: 'Git',
      description: '将内容和文件同步到 Git 仓库。'
    },
    onedrive: {
      title: 'Microsoft OneDrive',
      description: '使用 Microsoft OneDrive 存储文件。'
    },
    s3: {
      title: 'Amazon S3',
      description: '使用 Amazon S3 对象存储文件。'
    },
    s3generic: {
      title: 'S3 兼容存储',
      description: '使用兼容 S3 API 的对象存储。'
    },
    sftp: {
      title: 'SFTP',
      description: '通过 SFTP 将文件同步到远程服务器。',
      props: {
        host: {
          title: '主机地址',
          hint: '远程 SSH 服务器的主机名或 IP 地址。'
        },
        port: {
          title: '端口',
          hint: '远程服务器的 SSH 端口。'
        },
        authMode: {
          title: '身份验证方式',
          hint: '选择私钥或密码验证。建议使用私钥以获得更好的安全性。'
        },
        username: {
          title: '用户名',
          hint: '用于身份验证的用户名。'
        },
        privateKey: {
          title: '私钥内容',
          hint: '使用私钥验证时，填写私钥内容。'
        },
        passphrase: {
          title: '私钥密码',
          hint: '私钥加密时填写密码，否则留空。'
        },
        password: {
          title: '密码',
          hint: '使用密码验证时填写密码。'
        },
        basePath: {
          title: '基础目录路径',
          hint: '文件传输的目标基础目录。该目录必须已存在，且用户具有写入权限。'
        }
      }
    }
  }
}

const genericPropertyTranslations = {
  accessKeyId: { title: '访问密钥 ID' },
  apiKey: { title: 'API 密钥' },
  apiToken: { title: 'API 令牌' },
  appId: { title: '应用 ID' },
  appKey: { title: '应用密钥' },
  branch: { title: '分支' },
  bucket: { title: '存储桶' },
  clientId: { title: '客户端 ID' },
  clientSecret: { title: '客户端密钥' },
  connectionString: { title: '连接字符串' },
  container: { title: '容器' },
  domain: { title: '域名' },
  endpoint: { title: '服务地址' },
  folder: { title: '目录' },
  host: { title: '主机地址' },
  indexName: { title: '索引名称' },
  password: { title: '密码' },
  path: { title: '路径' },
  port: { title: '端口' },
  region: { title: '区域' },
  secretAccessKey: { title: '访问密钥' },
  server: { title: '服务器地址' },
  serverUrl: { title: '服务器地址' },
  siteId: { title: '站点 ID' },
  siteName: { title: '站点名称' },
  url: { title: '网址' },
  username: { title: '用户名' }
}

const genericTextTranslations = {
  'Access Key ID': '访问密钥 ID',
  'Access Key Secret': '访问密钥',
  'Account Access Key': '账户访问密钥',
  'Account Name': '账户名称',
  'Active': '启用',
  'Admin API Key': '管理 API 密钥',
  'App ID': '应用 ID',
  'App Key': '应用密钥',
  'Application ID': '应用 ID',
  'Authentication Method': '身份验证方式',
  'Authentication Type': '身份验证类型',
  'Base Directory Path': '基础目录路径',
  'Branch': '分支',
  'Bucket': '存储桶',
  'Client ID': '客户端 ID',
  'Client Secret': '客户端密钥',
  'Container Name': '容器名称',
  'Create Backup': '创建备份',
  'Create Daily Backups': '创建每日备份',
  'Domain': '域名',
  'Enabled': '启用',
  'Endpoint': '服务地址',
  'Endpoint URI': '服务地址',
  'Environment': '运行环境',
  'Export All': '导出全部内容',
  'Force Sync': '强制同步',
  'Host': '主机地址',
  'Host(s)': '主机地址',
  'Import Everything': '导入全部内容',
  'Index Name': '索引名称',
  'Instance URL': '实例地址',
  'License Key': '许可证密钥',
  'Local Repository Path': '本地仓库路径',
  'Name': '名称',
  'Password': '密码',
  'Password / PAT': '密码 / 个人访问令牌',
  'Path': '路径',
  'Port': '端口',
  'Private Key Contents': '私钥内容',
  'Private Key Passphrase': '私钥密码',
  'Project ID': '项目 ID',
  'Protocol': '协议',
  'Region': '区域',
  'Repository URI': '仓库地址',
  'Safe Mode': '安全模式',
  'Secret Access Key': '私有访问密钥',
  'Security Token': '安全令牌',
  'Server Host': '服务器主机',
  'Server URL': '服务器地址',
  'Service Name': '服务名称',
  'Shortname': '短站点名',
  'Site ID': '站点 ID',
  'Site Name': '站点名称',
  'SSH Private Key Mode': 'SSH 私钥模式',
  'Storage Tier': '存储层级',
  'Tag Number': '跟踪代码',
  'TLS Certificate Path': 'TLS 证书路径',
  'Unique bucket name': '唯一存储桶名称',
  'Use SSL': '使用 SSL',
  'Username': '用户名',
  'Verify SSL Certificate': '验证 SSL 证书',
  'Verify TLS Certificate': '验证 TLS 证书',
  'Website ID': '网站 ID'
}

const fallbackLabels = {
  accountKey: '账户访问密钥',
  accountName: '账户名称',
  akismet: 'Akismet API 密钥',
  allowDrawIoUnsafe: '允许 Draw.io 中的非安全元素',
  allowHTML: '允许 HTML',
  allowIFrames: '允许 iframe',
  alwaysNamespace: '始终使用语言目录',
  appId: '应用 ID',
  appKey: '应用密钥',
  appSecret: '应用密钥',
  apiKey: 'API 密钥',
  apiVersion: 'Elasticsearch 版本',
  authMode: '身份验证方式',
  authType: '身份验证类型',
  basePath: '基础目录路径',
  basicPassword: '密码 / 个人访问令牌',
  basicUsername: '用户名',
  beacon: 'Beacon 地址',
  branch: '分支',
  bucket: '存储桶',
  clientId: '客户端 ID',
  clientSecret: '客户端密钥',
  closeMarker: '结束标记',
  containerName: '容器名称',
  containerTrackingId: '容器跟踪 ID',
  createDailyBackups: '创建每日备份',
  defaultEmail: '默认作者邮箱',
  defaultName: '默认作者名称',
  dictLanguage: '词典语言',
  domain: '域名',
  endpoint: '服务地址',
  environment: '运行环境',
  errorBeacon: '错误 Beacon 地址',
  gitBinaryPath: 'Git 可执行文件路径',
  headerlessEnabled: '无表头',
  host: '主机地址',
  hosts: '主机地址',
  indexName: '索引名称',
  instanceUrl: '实例地址',
  licenseKey: '许可证密钥',
  linebreaks: '自动转换换行',
  linkify: '自动转换链接',
  localRepoPath: '本地仓库路径',
  minDelay: '发表评论间隔',
  multilineEnabled: '多行',
  openExternalLinkNewTab: '在新标签页中打开外部链接',
  openMarker: '开始标记',
  org: '组织 ID',
  passphrase: '私钥密码',
  password: '密码',
  path: '路径',
  port: '端口',
  privateKey: '私钥内容',
  projectId: '项目 ID',
  propertyTrackingId: '媒体资源跟踪 ID',
  protocol: '协议',
  quotes: '引号样式',
  region: '区域',
  relAttributeExternalLink: '保护使用新标签页打开的外部链接',
  repoUrl: '仓库地址',
  rowspanEnabled: '跨行合并',
  safeHTML: '净化 HTML',
  safeMode: '安全模式',
  s3BucketEndpoint: '单存储桶服务地址',
  s3ForcePathStyle: '强制使用路径样式',
  secretAccessKey: '私有访问密钥',
  securityToken: '安全令牌',
  server: '服务器地址',
  serverHost: '服务器地址',
  serverUrl: '服务器地址',
  serviceName: '服务名称',
  siteId: '站点 ID',
  siteName: '站点名称',
  sniffInterval: '节点检测间隔',
  sniffOnStart: '启动时检测节点',
  sshPrivateKeyContent: 'SSH 私钥内容',
  sshPrivateKeyMode: 'SSH 私钥模式',
  sshPrivateKeyPath: 'SSH 私钥路径',
  sslEnabled: '使用 SSL',
  storageTier: '存储层级',
  subEnabled: '启用下标',
  supEnabled: '启用上标',
  tabWidth: '制表符宽度',
  tagNumber: '跟踪代码',
  tlsCertPath: 'TLS 证书路径',
  typographer: '智能排版',
  underline: '下划线强调',
  url: '网址',
  useBlocks: 'TeX 区块',
  useInline: '行内 TeX',
  username: '用户名',
  verifySSL: '验证 SSL 证书',
  verifyTLSCertificate: '验证 TLS 证书',
  websiteID: '网站 ID'
}

function translateDefinition (type, value, symlink) {
  if (!value) {
    return value
  }
  const translations = _.get(moduleTranslations, [type, value.key], {})
  const translated = {
    ...value,
    title: translations.title || genericTextTranslations[value.title] || value.title,
    description: translations.description || genericTextTranslations[value.description] || value.description
  }
  if (value.config) {
    translated.config = value.config.map(cfg => {
      const prop = _.get(translations, ['props', cfg.key], {})
      const generic = _.get(genericPropertyTranslations, cfg.key, {})
      const cfgValue = {
        ...cfg.value,
        title: prop.title || generic.title || genericTextTranslations[cfg.value.title] || fallbackLabels[cfg.key] || fallbackLabels[cfg.value.title] || `设置项（${cfg.key}）`,
        hint: prop.hint || genericTextTranslations[cfg.value.hint] || (cfg.value.hint && /[A-Za-z]/.test(cfg.value.hint) ? `配置 ${cfg.key}，请按模块说明填写对应值。` : cfg.value.hint) || ''
      }
      cfgValue.enum = (cfgValue.enum || []).map(option => {
        const text = _.isObject(option) ? option.text : option
        if (!/[A-Za-z]/.test(text)) {
          return option
        }
        const translatedText = _.get(translations, ['enum', text]) || genericTextTranslations[text] || fallbackLabels[text] ||
          (typeof option === 'string' && /^[a-z][a-z-]*$/.test(option) ? `${symlink || type} 选项：${option}` : text)
        return _.isObject(option) ? { ...option, text: translatedText } : { text: translatedText, value: option }
      })
      return { ...cfg, value: cfgValue }
    })
  }
  if (value.actions) {
    translated.actions = value.actions.map(action => ({
      ...action,
      ..._.get(translations, ['actions', action.handler], {}),
      label: genericTextTranslations[action.label] || fallbackLabels[action.handler] || `操作（${action.handler}）`,
      hint: genericTextTranslations[action.hint] || (/[A-Za-z]/.test(action.hint || '') ? `执行 ${action.handler} 操作。` : action.hint)
    }))
  }
  return translated
}

export function translateAdminModule (type, value) {
  return translateDefinition(type, value, value.key)
}

export function translateAdminModules (type, values) {
  return values.map(value => translateDefinition(type, value, value.key))
}

export function translateRenderingCore (core) {
  const translated = {
    ...core,
    children: translateAdminModules('rendering', core.children || [])
  }
  const coreTitle = translated.input === 'markdown' ? 'Markdown 处理管线' : 'AsciiDoc 处理管线'
  return {
    ...translated,
    title: coreTitle,
    description: '文档渲染处理管线'
  }
}
