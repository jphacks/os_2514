# HandTrackingPresenter ドキュメント

## API概要
### 準備
- `import HandTrackingPresenter from './HandTrackingPresenter.js'`
- `const presenter = await HandTrackingPresenter.create({ onResult })`

### 呼び出し手順
- `await presenter.start()` でトラッキング開始
- 必要に応じて `await presenter.stop()` や `presenter.dispose()` を実行

### 取得できる結果
- `presenter.state` で `IDLE | RUN | CHARGE | KICK` を取得
- `presenter.confidence` で推定信頼度（0〜1）を取得
- `presenter.charge` でチャージ量（0〜1）を取得
- `presenter.actionState` で HandTracker からの生ペイロードへアクセス
- `presenter.tracker` で内部 HandTracker インスタンスへアクセス

## メソッドと戻り値対応表
| メソッド / プロパティ | 戻り値                         | 説明                                         |
|-----------------------|--------------------------------|----------------------------------------------|
| `HandTrackingPresenter.create(options)` | `Promise<HandTrackingPresenter>` | Presenter を生成するファクトリメソッド         |
| `presenter.start()`   | `Promise<void>`               | トラッキング処理を開始                       |
| `presenter.stop()`    | `Promise<void>`               | トラッキング処理を停止                       |
| `presenter.dispose()` | `void`                        | リソースを解放                                |
| `presenter.state`     | `string` (`IDLE` 等)          | 現在の正規化済み状態                          |
| `presenter.confidence`| `number`                      | 状態推定の信頼度（0〜1）                      |
| `presenter.charge`    | `number`                      | チャージ量（0〜1）                            |
| `presenter.isIdle`    | `boolean`                     | `state` が `IDLE` か判定                       |
| `presenter.isRunning` | `boolean`                     | `state` が `RUN` か判定                        |
| `presenter.isCharging`| `boolean`                     | `state` が `CHARGE` か判定                     |
| `presenter.isKicking` | `boolean`                     | `state` が `KICK` か判定                       |
| `presenter.actionState` | `object | null`             | HandTracker からの生アクションペイロード       |
| `presenter.tracker`   | `HandTracker | null`          | 内部 HandTracker インスタンスへの参照          |

## 内部処理詳細
- `create` 実行時に HandTracker を生成または既存インスタンスをフックし、`onResult` を内部フォワーダー経由で受け取る仕組みを構築している。
- 受信したペイロードは `#updateSnapshot` で状態・信頼度・チャージに展開され、API から即時参照できるよう保持される。
- 状態コードは `STATE_MAP` により `NONE`→`IDLE` に正規化し、外部へ一貫した名称を提供する。
- `start` / `stop` / `dispose` は HandTracker の同名メソッドをラップしており、ライフサイクル操作を簡潔にしている。
- `presenter.actionState` には HandTracker からの生データが保持され、必要に応じて詳細情報を直接参照できる。
