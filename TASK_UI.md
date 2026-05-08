# text-xiuxian CSS动画和视觉升级任务

## 项目信息
- src/style.css — 主样式文件(~1700行)
- src/ui/app.ts — UI渲染(~1500行)
- 当前主题：深棕仙侠风格，CSS变量体系，楷体字体
- 已有动画: mist-drift, notice-rise

## 任务：11项CSS动画和视觉效果升级

### 1. 背景灵气粒子 (CSS-only)
在app.ts的mount()中创建div#particles容器(在#app之前)，包含8个span.particle子元素。
CSS: #particles fixed全屏, pointer-events:none, z-index:0。
每个.particle: 绝对定位, 4-8px圆, radial-gradient发光, will-change:transform。
@keyframes particle-float: 从底部随机位置向上飘(translateY -100vh), 15-25s周期, infinite。
用nth-child(1)-(8)设不同left%, animation-duration, animation-delay。
颜色: var(--gold) 和 var(--jade) 各半, opacity 0.3-0.5。

### 2. 按钮光效 (Shine Sweep)
.action-btn: position:relative, overflow:hidden。
.action-btn::after: content:'', position:absolute, top:0, left:-100%, width:50%, height:100%, background:linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent), transition:left 0.5s。
.action-btn:hover::after: left:100%。

### 3. Modal卡片入场动画
@keyframes modal-enter { from { transform:scale(0.92); opacity:0; } to { transform:scale(1); opacity:1; } }
.modal-card: animation: modal-enter 0.28s cubic-bezier(0.34,1.56,0.64,1)。

### 4. 列表项stagger淡入
@keyframes card-stagger { from { transform:translateY(12px); opacity:0; } to { transform:translateY(0); opacity:1; } }
.recipe-card, .region-card, .bounty-card, .dungeon-card: animation: card-stagger 0.3s ease-out both。
:nth-child(1) delay:0s, :nth-child(2) delay:0.06s ... :nth-child(10) delay:0.54s。

### 5. 进度条发光
.qi-fill: background:linear-gradient(90deg, var(--cyan), #5bb8d4), box-shadow:0 0 8px rgba(115,145,155,0.4), transition:width 0.6s ease-out。
.hp-fill: background:linear-gradient(90deg, var(--crimson), #d4745b), box-shadow同理。
.exp-fill: background:linear-gradient(90deg, var(--jade), #8cb47a), box-shadow同理。
(这些class名需要检查app.ts中实际使用的class名)

### 6. Toast通知增强
.notice: backdrop-filter:blur(8px), border-top:2px solid var(--cyan)。
.notice-success: border-top-color:var(--jade)。
.notice-warn: border-top-color:var(--crimson)。
(检查app.ts中notice的渲染方式来确定class名)

### 7. 数值变化脉冲
@keyframes value-pulse { 0% { transform:scale(1); } 30% { transform:scale(1.15); color:var(--gold-strong); } 100% { transform:scale(1); } }
.value-changed: animation: value-pulse 0.4s ease-out。
在app.ts中: renderApp前保存旧qi/coin/hp值，render后对比，变化的元素加.value-changed class, 400ms后移除。

### 8. 境界突破特效
在app.ts中: tryBreakthrough成功时创建全屏overlay。
```html
<div class="breakthrough-overlay"><div class="breakthrough-text">突破成功！</div></div>
```
@keyframes breakthrough-flash { 0% { background:rgba(255,255,255,0.6); } 30% { background:rgba(210,164,88,0.4); } 100% { background:transparent; opacity:0; } }
.breakthrough-overlay: fixed全屏, z-index:9999, pointer-events:none, animation:breakthrough-flash 1.5s forwards。
.breakthrough-text: 居中, font-size:2.5rem, color:var(--gold-strong), text-shadow:0 0 30px rgba(210,164,88,0.8)。
1.5s后DOM移除。

### 9. 滚动条美化
::-webkit-scrollbar { width:6px; }
::-webkit-scrollbar-track { background:transparent; }
::-webkit-scrollbar-thumb { background:rgba(182,138,73,0.4); border-radius:3px; }
::-webkit-scrollbar-thumb:hover { background:rgba(182,138,73,0.6); }

### 10. 操作栏按钮悬浮
.action-btn: transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease。
.action-btn:hover: transform:translateY(-2px), box-shadow增强。
.action-btn:active: transform:translateY(0)。

### 11. 日志滑入
@keyframes log-slide { from { transform:translateX(-16px); opacity:0; } to { transform:translateX(0); opacity:1; } }
日志列表中第一条(最新)条目: animation: log-slide 0.3s ease-out。
(检查app.ts中日志渲染的class名)

## 重要约束
- @media (prefers-reduced-motion: reduce) 中禁用所有动画
- 粒子用will-change:transform优化性能
- 不破坏现有布局和功能
- 检查app.ts中实际的class名再写CSS
- npx tsc --noEmit 零错误 + npx vite build 通过
- 完成后运行验证命令
