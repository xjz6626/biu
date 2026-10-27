# Biu Mobile

一个独立的 React Native 手机音乐 App。桌面版仅作为业务与接口行为参考，本项目不依赖 Electron，也不导入桌面版源码。

## MVP 范围

- Bilibili 登录（优先二维码）
- 推荐与搜索
- 收藏夹同步
- 榜单记录
- 播放与本机/云端历史记录
- 播放队列、歌词、后台播放和锁屏控制

## 技术栈

- Expo SDK 57 / React Native 0.86
- Expo Router
- expo-audio
- Zustand + AsyncStorage
- TypeScript

## 开发

```bash
pnpm install
pnpm start
```

运行类型检查和 Web 导出验证：

```bash
pnpm typecheck
pnpm export:web
```

后台音频和锁屏控制需要 development build 或正式原生构建验证，不能只依赖浏览器预览。

## 目录

```text
src/app/             页面与导航
src/components/      移动端通用组件
src/domain/          领域类型
src/features/        登录、播放器、榜单等功能模块
src/services/api/    网络与 Bilibili 接口适配
```
