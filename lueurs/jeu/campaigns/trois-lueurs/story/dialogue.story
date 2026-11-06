== brindille
if lanterne-allumee
  - Regarde comme elle brille ! Le bourg ne l'oubliera jamais. #line:DB44525AEF6F650682FF63A92CC414A0
  stop
if quest:lueurs
  if item:lueur-pres and item:lueur-ocre and item:lueur-brumes
    - Les trois lueurs ! Monte vite au plateau et rallume la {Grande Lanterne}. #line:9B3745F252570B8C5C5E31916B9F9B89
    stop
  cycle brindille-rappel
    * - Une lueur sur le plateau, une dans les {Gorges d'Ocre}, une dans le {Marais des Brumes}. #line:51553E237B39000D12EF1210A5F82A7E
    * - Si tu es fatigué, touche une pierre de route : elle te soigne. #line:930ED871CA74593841F258622A379E1A
    * - Les gluants n'aiment pas les coups d'épée. Ni les roulades ! #line:2623DB556C5CC25028433118659DC780
  stop
- Ah, te voilà ! Il est arrivé un grand malheur. #line:5B66FF4037E2B8817C388A137D9E1A61
- Cette nuit, la {Grande Lanterne} du plateau s'est éteinte. Ses trois lueurs se sont envolées. #line:CA4F73E11D00BA4DD1B43F4A4B939047
- Une est restée sur le plateau. Une autre est partie vers les {Gorges d'Ocre}, à l'est. La dernière dans le {Marais des Brumes}, au sud. #line:E4AC7BA70265049E135F620C31306F47
choice Veux-tu nous aider ? #line:1D29E469C395C1E20074DCA3C65BA63A
  > Oui, je vais les retrouver ! #line:D14A3A14AF17D5FCF615AF81F59AD909
    - Merci ! Prends ton épée : des gluants traînent sur le plateau. #line:649CA47FDEC83829D19F0AC286B250C3
    - L'escalier est juste au nord de la place. #line:8EDFBCAE9488A32DE52BE6A7B24590B3
    quest lueurs stage demande
  > Pas tout de suite #line:78D9BEEEE7E96B6F0E65EB2AE09CBD7E
    - Reviens me voir quand tu seras prêt. #line:82656C31D12F5C764C42F6C9955085E4

== sadia
if item:lueur-ocre
  - Ta flamme orange va bien avec le sable, tu ne trouves pas ? #line:22C2F704D3D161F407998630E31504F1
  stop
- Bienvenue à l'oasis, voyageur. Assieds-toi près du feu. #line:E098A9515279068F7DB098D3D1D04DD9
loop
  choice Que veux-tu savoir ? #line:436A9B33293C0F67C99BD3B6A1DCD718
    > [once] Tu as vu une lueur ? #line:D33541AFA43C3FFEB58CDF00C72E63E4
      - Une flamme orange est passée au-dessus des gorges hier soir. #line:5D0DB56CDE84F9D04A11F75DE5ED3039
      - Elle s'est posée sur le {haut plateau}, au nord-est. Les marches sont au pied des falaises. #line:0C4FE2090DF376E42DCBB578C1CE965E
    > [once] Pourquoi le sable est rouge ? #line:EB6084391A3DE272369CDAF1000D4543
      - Le vent use les falaises depuis des milliers d'années. Le sable, c'est leur poussière. #line:38EFB3C78986D9689DEEA4F88A18FE5A
    > Merci, Sadia. #line:4F49A62463794411ADA8EFE1EFF76BD7
      - Bonne route ! Méfie-toi des sangliers, ils foncent tout droit. #line:FB34DFF2F52C7ED19B92E36E5887676D
      break

== ambroise
if item:lueur-brumes
  - Sans la lueur bleue, le marais paraît plus sombre. Mais je sais qu'elle sera mieux là-haut. #line:88E48038D8316CA27914DAB123419EB4
  stop
- Oh ! Un visiteur, à cette heure ? Ici, il fait toujours un peu soir. #line:80B398EBB4E3DB321434BD59302B4CB2
- Tu cherches la flamme bleue ? Elle danse sur l'{îlot}, au sud-ouest. #line:40B97CE13D028017E876903AF6A63D59
- Suis les pontons. Et ne tombe pas dans l'eau, elle est froide ! #line:2D71BEB50A39008FD9E5E77CB232FFC3

== lueur-pres
sfx chime
: Une petite flamme verte se pose dans tes mains. Elle sent l'herbe coupée. #line:8737A1F016E36C2E4166BF416A54BD9A
give lueur-pres

== lueur-ocre
sfx chime
: Une flamme orange, chaude comme le sable à midi, vient se blottir contre toi. #line:0EB357BBEC313F263D0F4DD67F641331
give lueur-ocre

== lueur-brumes
sfx chime
: Une flamme bleue sort de la brume et tourne trois fois autour de toi. #line:5BA6878747E28E5018004C41E7DE9C41
give lueur-brumes

== lanterne
if lanterne-allumee
  : La Grande Lanterne brille, chaude et claire. #line:2836AADD4C1DF38114861D4B84AAA6BA
  stop
if not item:lueur-pres or not item:lueur-ocre or not item:lueur-brumes
  : La Grande Lanterne est froide. Il lui manque des lueurs. #line:16C9A9804620FF71CE6D3DB04FDA1B3B
  : Regarde ta liste de quêtes (touche B) pour savoir lesquelles. #line:877052D2D21E67FA54BF605D6195D99A
  stop
cutscene
camera lanterne 1.2
: Tu poses les trois lueurs dans la Grande Lanterne… #line:583CB5C6CDCCC37FB460BAE20E49A7F4
take lueur-pres
take lueur-ocre
take lueur-brumes
fade out 0.6
sfx chime
set lanterne-allumee
quest lueurs stage fin
quest lueurs done
wait 0.5
fade in 1
shake 0.3
: Verte, orange et bleue, la flamme se rallume et monte haut dans le ciel ! #line:DDFD2B111C04578B563FDC6D72674F60
banner La Grande Lanterne brille ! | Merci, héros du bourg #line:16A05E354459FFAC538AD41D23D66AA4
camera reset 1
ending lanterne La Lanterne rallumée #line:B09875A2CDC8F2DC89197BDF564FFD42
