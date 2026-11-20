import UIKit
import Capacitor

/// Webビューの下地を紙の色にする（起動直後・引っぱりすぎたときに白が見えないように）。
/// 色は Assets の Paper（明るい #F6F2EA／暗い #181816）で、端末の外観に合わせて自動で替わる。UX設計書 7.3「起動画面」
class AppViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        let paper = UIColor(named: "Paper")
        view.backgroundColor = paper
        webView?.isOpaque = false
        webView?.backgroundColor = paper
        webView?.scrollView.backgroundColor = paper
    }
}
