// 段階5（購入）のシミュレーター確認。アプリの中で動く（ホストつき）テストで、StoreKit のテスト環境（SKTestSession）を使い、
// 画面（WKWebView の JS）を実際に動かして UX設計書 3.6 の状態の表を確かめる。
//   xcodebuild test -project App.xcodeproj -scheme App -destination 'platform=iOS Simulator,name=iPhone 17'
//   スクリーンショットは環境変数 TEST_RUNNER_SHOT_DIR のフォルダ（無ければ一時フォルダ）と、結果（xcresult）の添付に残す。
// testZ_reinstallBoot は「入れ直し → 起動だけで開く」用。アプリを消してから単独で流す（TEST_RUNNER_REINSTALL=1）。
import XCTest
import StoreKit
import StoreKitTest
import WebKit
import UIKit

@MainActor
final class PurchaseFlowTests: XCTestCase {
    static let pid = "jp.co.hpmnagoya.enpitsu.allmocks"
    var session: SKTestSession!
    let env = ProcessInfo.processInfo.environment
    var shotDir: String { env["SHOT_DIR"] ?? NSTemporaryDirectory() }

    // MARK: - 道具
    func webView() -> WKWebView? {
        for scene in UIApplication.shared.connectedScenes {
            guard let ws = scene as? UIWindowScene else { continue }
            for w in ws.windows { if let v = find(w) { return v } }
        }
        return nil
    }
    private func find(_ v: UIView) -> WKWebView? {
        if let w = v as? WKWebView { return w }
        for s in v.subviews { if let r = find(s) { return r } }
        return nil
    }
    @discardableResult
    func js(_ body: String) async throws -> Any? {
        guard let w = webView() else { XCTFail("WKWebView が見つからない"); return nil }
        return try await w.callAsyncJavaScript(body, arguments: [:], in: nil, contentWorld: .page)
    }
    func jsString(_ expr: String) async -> String { ((try? await js("return String(\(expr))")) as? String) ?? "" }
    func expect(_ expr: String, _ value: String, _ msg: String = "", line: UInt = #line) async {
        let v = await jsString(expr); XCTAssertEqual(v, value, msg, line: line)
    }
    func expectNot(_ expr: String, _ value: String, _ msg: String = "", line: UInt = #line) async {
        let v = await jsString(expr); XCTAssertNotEqual(v, value, msg, line: line)
    }
    func waitJS(_ cond: String, _ what: String, timeout: Double = 20) async throws {
        let end = Date().addingTimeInterval(timeout)
        while Date() < end {
            if let b = (try? await js("try{ return !!(\(cond)); }catch(e){ return false; }")) as? Bool, b { return }
            try await Task.sleep(nanoseconds: 200_000_000)
        }
        let sheet = await jsString("(document.getElementById('buydlg')||{}).textContent||''")
        let st = await jsString("JSON.stringify(typeof Purchase!=='undefined'?Purchase.state:null)")
        XCTFail("待ちきれない：\(what)\n  条件：\(cond)\n  シート：\(sheet)\n  状態：\(st)")
    }
    func shot(_ name: String) async {
        try? await Task.sleep(nanoseconds: 600_000_000)
        guard let win = webView()?.window else { return }
        let img = UIGraphicsImageRenderer(bounds: win.bounds).image { _ in _ = win.drawHierarchy(in: win.bounds, afterScreenUpdates: true) }
        try? img.pngData()?.write(to: URL(fileURLWithPath: shotDir).appendingPathComponent("\(name).png"))
        let a = XCTAttachment(image: img); a.name = name; a.lifetime = .keepAlways; add(a)
    }
    func waitBoot() async throws {
        try await waitJS("typeof Purchase!=='undefined'&&typeof MOCKS!=='undefined'&&MOCKS.length>0&&Store.ready&&Router.top()", "起動")
    }
    /// 控えを消して、ストアの口を作り直す（テスト環境の session で）
    func resetApp() async throws {
        try await waitBoot()
        try await js("""
            closeDlg('buydlg'); closeDlg('askdlg');
            saveJSON(K.ent,{unlocked:false}); saveJSON(K.profile,Object.assign({},profile(),{onboarded:1}));
            invalidateUnits(); Purchase.use(NativeStore()); await Store.flush();
            Router.tab('today'); Router.tab('mock');
        """)
        try await waitJS("Router.top().name==='mock'", "模試の一覧")
    }
    func openSheetAndWaitPrice() async throws {
        try await js("Purchase.open()")
        try await waitJS("Purchase.state.prodSt==='ok'&&/で開く$/.test(document.querySelector('#buydlg [data-act=buy]').textContent)", "価格の取得")
    }
    func makeSession() throws {
        let url = Bundle(for: PurchaseFlowTests.self).url(forResource: "Products", withExtension: "storekit")!
        session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.disableDialogs = true          // 確認の画面を出さずに買う（StoreKit のテスト環境だけ）
        session.askToBuyEnabled = false
        session.storefront = "JPN"
        session.locale = Locale(identifier: "ja_JP")
        session.clearTransactions()
    }

    override func setUp() async throws {
        continueAfterFailure = true
        try makeSession()
    }
    override func tearDown() async throws {
        if #available(iOS 17.0, *) {
            try? await session.setSimulatedError(nil, forAPI: .purchase)
            try? await session.setSimulatedError(nil, forAPI: .loadProducts)
            try? await session.setSimulatedError(nil, forAPI: .appStoreSync)
        }
        session.clearTransactions()
    }

    // MARK: - 下準備の確認：StoreKit のテスト環境で商品が取れる
    func test00_probe() async throws {
        let products = try await Product.products(for: [Self.pid])
        XCTAssertEqual(products.count, 1, "テスト環境（Products.storekit）の商品が取れる")
        print("PROBE products=\(products.map { $0.id + " " + $0.displayPrice })")
    }

    // MARK: - 購入（成功）・表示価格・購入ずみの人にボタンを出さない
    func test01_purchaseSuccess() async throws {
        if env["REINSTALL"] == "1" { throw XCTSkip("入れ直しの回") }
        try await resetApp()
        await shot("ios_00_mock_list_locked")
        try await openSheetAndWaitPrice()
        let price = await jsString("Purchase.state.price")
        let products = try await Product.products(for: [Self.pid])
        XCTAssertEqual(price, products.first?.displayPrice, "表示価格がストアの価格と一致")
        await expect("document.querySelector('#buydlg [data-act=buy]').textContent", "\(price)で開く")
        await shot("ios_01_sheet_ready")
        try await js("ACT.buy()")
        try await waitJS("Purchase.unlocked&&/が開きました/.test(document.getElementById('buydlg').textContent)", "成功の表示")
        await expect("loadJSON(K.ent).unlocked", "true")
        await expect("document.querySelector('#buydlg .btn.pri').textContent", "模試2の準備へ")
        await shot("ios_02_success")
        try await js("Purchase.close(); Router.tab('today'); Router.tab('mock');")
        try await waitJS("!document.querySelector('#page [data-act=mLocked],#page [data-act=buyOpen]')", "一覧から鍵と購入の案内が消える")
        await shot("ios_03_mock_list_unlocked")
        try await js("Router.go('settings'); setTimeout(()=>document.querySelector('#page [data-act=buyRestore]').scrollIntoView({block:'center'}),50);")
        try await waitJS("!document.querySelector('#page [data-act=buyOpen]')&&/購入ずみ/.test(document.querySelector('#page [data-act=buyRestore]').textContent)", "設定：購入ずみ")
        await shot("ios_04_settings_purchased")
        XCTAssertEqual(session.allTransactions().filter { $0.productIdentifier == Self.pid }.count, 1)
    }

    // MARK: - 取り消し（何も言わずに元のシートへ）
    func test02_cancel() async throws {
        if env["REINSTALL"] == "1" { throw XCTSkip("入れ直しの回") }
        guard #available(iOS 17.0, *) else { throw XCTSkip("iOS 17 以上") }
        try await resetApp()
        try await session.setSimulatedError(.generic(.userCancelled), forAPI: .purchase)
        try await openSheetAndWaitPrice()
        try await js("ACT.buy()")
        try await waitJS("!Purchase.state.busy", "手続きの終わり")
        let st = await jsString("JSON.stringify(Purchase.state)")
        await expect("Purchase.state.st", "", "取り消し：状態は元のまま（\(st)）")
        await expect("document.getElementById('buyst').hidden", "true", "取り消し：何も言わない")
        await expect("Purchase.unlocked", "false")
        await shot("ios_05_cancel_back_to_sheet")
    }

    // MARK: - 失敗（料金はかかっていません＋もう一度）
    func test03_failure() async throws {
        if env["REINSTALL"] == "1" { throw XCTSkip("入れ直しの回") }
        guard #available(iOS 17.0, *) else { throw XCTSkip("iOS 17 以上") }
        try await resetApp()
        try await session.setSimulatedError(.purchase(.purchaseNotAllowed), forAPI: .purchase)
        try await openSheetAndWaitPrice()
        try await js("ACT.buy()")
        try await waitJS("/購入できませんでした。料金はかかっていません/.test(document.getElementById('buydlg').textContent)", "失敗の表示")
        await expect("document.querySelector('#buydlg [data-act=buy]').textContent", "もう一度")
        await expect("Purchase.unlocked", "false")
        await shot("ios_06_failed")
        try await session.setSimulatedError(nil, forAPI: .purchase)
        try await js("ACT.buy()")   // もう一度 → 価格を取り直してから買える状態にもどる
        try await waitJS("Purchase.unlocked||/で開く$/.test(document.querySelector('#buydlg [data-act=buy]')?.textContent||'')", "もう一度")
    }

    // MARK: - 保留（承認待ち）→ 承認で自動で開く
    func test04_askToBuy() async throws {
        if env["REINSTALL"] == "1" { throw XCTSkip("入れ直しの回") }
        try await resetApp()
        session.askToBuyEnabled = true
        try await openSheetAndWaitPrice()
        try await js("ACT.buy()")
        try await waitJS("/手続きの完了を待っています。完了すると自動で開きます/.test(document.getElementById('buydlg').textContent)", "保留の表示")
        await expect("loadJSON(K.ent).pending", "true")
        await expect("Purchase.unlocked", "false")
        await shot("ios_07_pending")
        let tx = session.allTransactions().first { $0.productIdentifier == Self.pid && $0.pendingAskToBuyConfirmation }
        XCTAssertNotNil(tx, "承認待ちの取引がある")
        if let tx { try session.approveAskToBuyTransaction(identifier: tx.identifier) }
        try await waitJS("Purchase.unlocked&&/が開きました/.test(document.getElementById('buydlg').textContent)", "承認で自動で開く", timeout: 30)
        await expect("loadJSON(K.ent).pending", "false")
        await shot("ios_08_pending_approved")
    }

    // MARK: - 復元（なかった／見つかった／つながらない）
    func test05_restore() async throws {
        if env["REINSTALL"] == "1" { throw XCTSkip("入れ直しの回") }
        try await resetApp()
        try await js("Purchase.open()")
        try await js("await ACT.buyRestore()")
        try await waitJS("/このアカウントでの購入は見つかりませんでした/.test(document.getElementById('buydlg').textContent)", "復元：なかった")
        await shot("ios_09_restore_none")
        if #available(iOS 17.0, *) {
            try await session.setSimulatedError(.generic(.networkError(URLError(.notConnectedToInternet))), forAPI: .appStoreSync)
            try await js("await ACT.buyRestore()")
            try await waitJS("/いまストアにつながりません/.test(document.getElementById('buydlg').textContent)", "復元：つながらない")
            try await session.setSimulatedError(nil, forAPI: .appStoreSync)
        }
        _ = try await session.buyProduct(identifier: Self.pid)   // 同じアカウントで、別の端末で買ってあった
        try await js("saveJSON(K.ent,{unlocked:false}); invalidateUnits();")
        try await js("await ACT.buyRestore()")
        try await waitJS("Purchase.unlocked&&/購入を確認しました/.test(document.getElementById('buydlg').textContent)", "復元：見つかった")
        await shot("ios_10_restore_found")
        // 設定からの復元（なかった）
        session.clearTransactions()
        try await js("Purchase.close(); saveJSON(K.ent,{unlocked:false}); invalidateUnits(); Router.go('settings');")
        try await js("await ACT.buyRestore(); document.getElementById('rstst').scrollIntoView({block:'center'});")
        try await waitJS("/このアカウントでの購入は見つかりませんでした/.test(document.getElementById('page').textContent)&&!document.querySelector('dialog#buydlg[open]')", "設定から復元：なかった")
        await shot("ios_11_settings_restore_none")
    }

    // MARK: - 払いもどし後は鍵にもどす
    func test06_refund() async throws {
        if env["REINSTALL"] == "1" { throw XCTSkip("入れ直しの回") }
        try await resetApp()
        try await openSheetAndWaitPrice()
        try await js("ACT.buy()")
        try await waitJS("Purchase.unlocked", "購入")
        try await js("Purchase.close()")
        let tx = session.allTransactions().first { $0.productIdentifier == Self.pid }
        XCTAssertNotNil(tx)
        if let tx { try session.refundTransaction(identifier: tx.identifier) }
        // ストアの知らせ（Transaction.updates）か、前面にもどったときの確認のどちらかで鍵にもどる
        let end = Date().addingTimeInterval(8)
        while Date() < end, await jsString("Purchase.unlocked") == "true" { try await Task.sleep(nanoseconds: 300_000_000) }
        let byEvent = await jsString("Purchase.unlocked") == "false"
        if !byEvent { try await js("await Purchase.check()") }
        await expect("Purchase.unlocked", "false", "払いもどし後は鍵にもどる（知らせで：\(byEvent)）")
        await expect("loadJSON(K.ent).unlocked", "false")
        try await js("Router.tab('today'); Router.tab('mock');")
        try await waitJS("document.querySelector('#page [data-act=mLocked]')", "一覧に鍵がもどる")
        await shot("ios_12_refunded_locked")
    }

    // MARK: - オフライン（ストアにつながらない）／オフラインでも購入ずみは開いたまま
    func test07_offline() async throws {
        if env["REINSTALL"] == "1" { throw XCTSkip("入れ直しの回") }
        guard #available(iOS 17.0, *) else { throw XCTSkip("iOS 17 以上") }
        try await resetApp()
        try await session.setSimulatedError(.generic(.networkError(URLError(.notConnectedToInternet))), forAPI: .loadProducts)
        try await js("Purchase.open()")
        try await waitJS("/いまストアにつながりません。通信できる場所でもう一度お試しください/.test(document.getElementById('buydlg').textContent)", "オフラインの文")
        await expect("document.querySelector('#buydlg [data-act=buy]').textContent", "もう一度")
        await shot("ios_13_offline")
        try await session.setSimulatedError(nil, forAPI: .loadProducts)
        try await js("ACT.buy()")
        try await waitJS("/で開く$/.test(document.querySelector('#buydlg [data-act=buy]').textContent)", "「もう一度」で価格が取れる")
        try await js("Purchase.close()")
    }

    // MARK: - 入れ直し → 起動だけで開く（アプリを消してから単独で流す）
    func testZ_reinstallBoot() async throws {
        guard env["REINSTALL"] == "1" else { throw XCTSkip("TEST_RUNNER_REINSTALL=1 のときだけ") }
        try await waitBoot()
        await expectNot("loadJSON(K.ent).unlocked", "true", "入れ直した直後：控えは空（未購入）")
        _ = try await session.buyProduct(identifier: Self.pid)   // このアカウントは購入ずみ（ストア側に記録がある）
        // 起動（Webビューを読みなおす＝boot から）。復元は押さない
        try await js("setTimeout(()=>location.reload(),10); return 1;")
        try await Task.sleep(nanoseconds: 1_500_000_000)
        try await waitBoot()
        try await waitJS("Purchase.unlocked&&loadJSON(K.ent).unlocked===true", "起動の確認だけで開く")
        await expect("Purchase.state.rst", "", "復元は使っていない")
        await expect("!!document.querySelector('dialog[open]')", "false", "シートは自動で開かない")
        try await js("Router.tab('mock')")
        try await waitJS("Router.top().name==='mock'&&!document.querySelector('#page [data-act=mLocked]')", "全部の回が開いている")
        await shot("ios_14_reinstall_boot_unlocked")
    }

    // MARK: - 本物のストア（StoreKit のテスト環境なし＝xcodebuild から流したとき）：商品が見つからない・つながらないときに落ちず、文面が出る
    func test08_realStoreUnavailable() async throws {
        if env["REINSTALL"] == "1" { throw XCTSkip("入れ直しの回") }
        if let p = try? await Product.products(for: [Self.pid]), !p.isEmpty { throw XCTSkip("商品が取れる環境（StoreKit のテスト環境が効いている）") }
        try await waitBoot()
        try await js("""
            closeDlg('buydlg'); saveJSON(K.ent,{unlocked:false}); saveJSON(K.profile,Object.assign({},profile(),{onboarded:1}));
            invalidateUnits(); Purchase.use(NativeStore()); Router.tab('today'); Router.tab('mock');
        """)
        try await waitJS("Router.top().name==='mock'&&document.querySelector('#page [data-act=buyOpen]')", "一覧の案内")
        await shot("ios_real_01_mock_list")
        try await js("Purchase.open()")
        try await waitJS("Purchase.state.prodSt==='fail'&&/いまストアにつながりません/.test(document.getElementById('buydlg').textContent)", "ストアにつながらない文")
        await expect("document.querySelector('#buydlg [data-act=buy]').textContent", "もう一度")
        await expect("/¥|\\$/.test(document.getElementById('buydlg').textContent)", "false", "価格が取れないときは金額を書かない")
        await shot("ios_real_02_sheet_unavailable")
        // 復元（AppStore.sync）は、アカウントが無いと OS のサインイン画面が前に出る（自前の画面は作らない）。ここでは押さずに設定へ
        try await js("Purchase.close(); Router.go('settings'); setTimeout(()=>document.querySelector('#page [data-act=buyRestore]').scrollIntoView({block:'center'}),50);")
        try await waitJS("document.querySelector('#page [data-act=buyOpen]')&&document.querySelector('#page [data-act=buyRestore]')", "設定の購入の欄")
        await shot("ios_real_04_settings")
        await expect("Purchase.unlocked", "false")
    }

    // MARK: - 自己テスト（index.html?test）をシミュレーターの中で
    func testZZ_selftest() async throws {
        if env["REINSTALL"] == "1" { throw XCTSkip("入れ直しの回") }
        try await waitBoot()
        try await js("setTimeout(()=>{ location.href='index.html?test'; },10); return 1;")
        try await Task.sleep(nanoseconds: 1_500_000_000)
        try await waitJS("window.__SELFTEST", "自己テストの終わり", timeout: 300)
        let pass = await jsString("window.__SELFTEST.pass"), fail = await jsString("window.__SELFTEST.fail")
        let fails = await jsString("JSON.stringify(window.__SELFTEST.failures)")
        print("SELFTEST iOS \(pass) pass / \(fail) fail \(fails)")
        XCTAssertEqual(fail, "0", fails)
        await shot("ios_15_selftest")
        try await js("setTimeout(()=>{ location.href='index.html'; },10); return 1;")
        try await Task.sleep(nanoseconds: 1_500_000_000)
    }
}
