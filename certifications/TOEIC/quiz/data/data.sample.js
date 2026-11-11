window.TOEIC_DATA = {
part2:[
 {id:"P2-01",num:7,tag:"WH疑問文",vq:"US-F",va:"US-M",audio:"audio/P2-01.mp3",prompt:"Where should I send the invoice?",c:["To the accounting office.","It was very expensive.","Yes, I sent it yesterday."],a:0,ja:{prompt:"請求書はどこに送ればいいですか。",c:["経理部です。","とても高かったです。","はい、昨日送りました。"]},e:"経理部という送付先を答えた内容が正解。場所を問う質問に値段や Yes で答える選択肢は不適切。"},
 {id:"P2-02",num:8,tag:"平叙文",vq:"UK-M",va:"AU-F",audio:"audio/P2-02.mp3",prompt:"The projector in Room B isn't working.",c:["I'll call the technician.","Room B is on the second floor.","It's a new product."],a:0,ja:{prompt:"B室のプロジェクターが動きません。",c:["技術者を呼びます。","B室は2階です。","新製品です。"]},e:"問題への対処を申し出る応答が自然。場所の説明は話題が外れる。"}
],
part3:[
 {id:"P3-01",num:32,intro:"conversation",audio:"audio/P3-01.mp3",speakers:[{k:"M1",v:"US-M"},{k:"F1",v:"UK-F"}],
  lines:[{s:"M1",t:"Hi Nancy, did you see the delivery schedule for next week?"},{s:"F1",t:"Yes. The Monday shipment is delayed until Wednesday."},{s:"M1",t:"Then I'll tell the customers today."}],
  ja:["ナンシー、来週の配送予定を見ましたか。","はい。月曜の出荷は水曜に延びます。","では今日、顧客に伝えます。"],
  graphic:{title:"Delivery Schedule",rows:[["Day","Item","Status"],["Mon","Chairs","Delayed"],["Tue","Desks","On time"]]},
  qs:[{num:32,q:"What are the speakers discussing?",c:["A delivery schedule","A hiring plan","A budget report","A product design"],a:0,e:"配送予定の話。",tag:"主題・目的"},
      {num:33,q:"Look at the graphic. Which item is delayed?",c:["Chairs","Desks","Lamps","Shelves"],a:0,e:"表で Delayed は Chairs。",tag:"図表問題"},
      {num:34,q:"What will the man do next?",c:["Contact customers","Visit a factory","Order desks","Update a website"],a:0,e:"顧客に伝えると言っている。",tag:"次の行動"}]}
],
part4:[
 {id:"P4-01",num:71,intro:"telephone message",audio:"audio/P4-01.mp3",v:"US-F",text:"Hello, this is Kate Morris from Greenfield Dental. I'm calling to confirm your appointment on Friday at 3 P.M. Please arrive ten minutes early to fill out a form.",ja:"こんにちは、グリーンフィールド歯科のケイト・モリスです。金曜午後3時のご予約の確認です。書類記入のため10分前にお越しください。",
  qs:[{num:71,q:"Why is the speaker calling?",c:["To confirm an appointment","To cancel an order","To offer a job","To ask for a refund"],a:0,e:"予約確認の電話。",tag:"主題・目的"},
      {num:72,q:"What are listeners asked to do?",c:["Arrive early","Bring a payment","Call back","Sign a contract"],a:0,e:"10分前に来るよう依頼。",tag:"詳細"},
      {num:73,q:"What kind of business is Greenfield?",c:["A dental clinic","A bank","A school","A bakery"],a:0,e:"Dental から。",tag:"話者・場所"}]}
],
part5:[
 {id:"P5-01",num:101,tag:"品詞",q:"The manager praised the team for its ------- work on the project.",c:["diligent","diligence","diligently","diligences"],a:0,ja:"部長はそのプロジェクトでのチームの勤勉な仕事ぶりを称賛した。",e:"名詞 work を修飾する形容詞が必要。diligently は副詞で不可。"},
 {id:"P5-02",num:102,tag:"前置詞・接続詞",q:"------- the weather was bad, the event went ahead as planned.",c:["Although","Despite","Because","Unless"],a:0,ja:"天気は悪かったが、イベントは予定通り行われた。",e:"節が続くので接続詞。Despite は前置詞で不可。"}
],
part6:[
 {id:"P6-01",num:131,doc:"e-mail",text:"Dear staff,\n\nThe office will be closed on Monday {{1}} the holiday. Please {{2}} your laptops home. {{3}} We apologize for any inconvenience. IT support will be {{4}} by phone.",sum:"休日による休業の連絡メール。",
  qs:[{num:131,c:["for","because","during","so"],a:0,e:"for the holiday で目的。",tag:"文法"},{num:132,c:["take","taking","took","taken"],a:0,e:"Please の後は原形。",tag:"文法"},{num:133,c:["Work will resume on Tuesday.","The holiday is popular.","Laptops are expensive.","Lunch is provided."],a:0,e:"休業の後は再開の連絡。",tag:"文挿入"},{num:134,c:["available","availably","avail","availing"],a:0,e:"be 動詞の補語は形容詞。",tag:"語彙"}]}
],
part7:[
 {id:"P7S-01",docs:[{type:"notice",title:"Parking Notice",text:"Starting June 1, parking in Lot B will require a permit.\nPermits are available at the front desk.\n[1] Please apply by May 25."}],sum:["6月1日から駐車許可証が必要になる通知。"],
  qs:[{num:147,q:"What is the purpose of the notice?",c:["To announce a new rule","To advertise a sale","To request a refund","To schedule a meeting"],a:0,e:"新ルールの告知。",tag:"主旨・目的"},{num:148,q:"Where can permits be obtained?",c:["At the front desk","Online","By mail","In Lot B"],a:0,e:"front desk と明記。",tag:"詳細"}]},
 {id:"P7M-01",docs:[{type:"e-mail",title:"From: Ann Lee",text:"Hi Tom,\nCan we move the meeting to Thursday?\nAnn"},{type:"schedule",title:"Weekly Schedule",text:"Wed  10:00  Staff meeting\nThu  10:00  Client call\nThu  14:00  Open"}],sum:["会議の変更依頼のメール。","週間予定表。"],
  qs:[{num:149,q:"When will the meeting most likely be held?",c:["Thursday at 2 P.M.","Wednesday at 10 A.M.","Thursday at 10 A.M.","Friday"],a:0,e:"木曜10時は顧客対応、14時が空き。",tag:"複数文書の照合"},{num:150,q:"Who is Ann Lee?",c:["A coworker","A client","A landlord","A reporter"],a:0,e:"同僚として依頼。",tag:"推測"}]}
]};
