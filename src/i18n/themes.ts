import { categories, categoryGroups, type Category } from '../puzzleThemes'
import type { Language } from './translations'

type Translations = readonly [string, string, string, string, string, string]
type Group = (typeof categoryGroups)[number]['label']

// Order: French, Spanish, Japanese, Simplified Chinese, Hindi, Italian.
const themes: Record<Category, Translations> = {
  mate: ['Tous les mats', 'Todos los mates', 'チェックメイト', '将杀', 'सभी मात', 'Tutti i matti'],
  mateIn1: ['Mat en 1', 'Mate en 1', '1手詰め', '一步将杀', '1 चाल में मात', 'Matto in 1'],
  mateIn2: ['Mat en 2', 'Mate en 2', '2手詰め', '两步将杀', '2 चाल में मात', 'Matto in 2'],
  mateIn3: ['Mat en 3', 'Mate en 3', '3手詰め', '三步将杀', '3 चाल में मात', 'Matto in 3'],
  mateIn4: ['Mat en 4', 'Mate en 4', '4手詰め', '四步将杀', '4 चाल में मात', 'Matto in 4'],
  mateIn5: ['Mat en 5+', 'Mate en 5+', '5手以上の詰め', '五步及以上将杀', '5+ चाल में मात', 'Matto in 5+'],
  advancedPawn: ['Pion avancé', 'Peón avanzado', '前進したポーン', '挺进兵', 'आगे बढ़ा प्यादा', 'Pedone avanzato'],
  attackingF2F7: ['Attaque en f2 / f7', 'Ataque en f2 / f7', 'f2 / f7への攻撃', '攻击 f2 / f7', 'f2 / f7 पर आक्रमण', 'Attacco a f2 / f7'],
  capturingDefender: ['Capture du défenseur', 'Captura del defensor', '守備駒の捕獲', '吃掉防守子', 'रक्षक को मारना', 'Cattura del difensore'],
  discoveredAttack: ['Attaque à la découverte', 'Ataque a la descubierta', '開き攻撃', '闪击', 'खुला आक्रमण', 'Attacco di scoperta'],
  doubleCheck: ['Échec double', 'Jaque doble', '両王手', '双将', 'दोहरा शह', 'Scacco doppio'],
  exposedKing: ['Roi exposé', 'Rey expuesto', '無防備なキング', '暴露的王', 'असुरक्षित राजा', 'Re esposto'],
  fork: ['Fourchettes', 'Tenedores', 'フォーク', '双重攻击', 'दोहरा हमला', 'Forchette'],
  hangingPiece: ['Pièce en prise', 'Pieza indefensa', '取り放題の駒', '无保护的棋子', 'असुरक्षित मोहरा', 'Pezzo indifeso'],
  kingsideAttack: ['Attaque à l’aile roi', 'Ataque en el flanco de rey', 'キングサイド攻撃', '王翼进攻', 'राजपक्ष पर आक्रमण', 'Attacco sul lato di re'],
  pin: ['Clouage', 'Clavada', 'ピン', '牵制', 'पिन', 'Inchiodatura'],
  queensideAttack: ['Attaque à l’aile dame', 'Ataque en el flanco de dama', 'クイーンサイド攻撃', '后翼进攻', 'वज़ीर पक्ष पर आक्रमण', 'Attacco sul lato di donna'],
  sacrifice: ['Sacrifice', 'Sacrificio', 'サクリファイス', '弃子', 'बलिदान', 'Sacrificio'],
  skewer: ['Enfilade', 'Enfilada', '串刺し', '串击', 'भेदक हमला', 'Infilata'],
  trappedPiece: ['Pièce piégée', 'Pieza atrapada', '閉じ込められた駒', '被困棋子', 'फँसा हुआ मोहरा', 'Pezzo intrappolato'],
  attraction: ['Attraction', 'Atracción', '誘引', '引入', 'आकर्षण', 'Attrazione'],
  clearance: ['Libération de case', 'Despeje', 'スペースの確保', '腾挪', 'खाना खाली करना', 'Sgombero'],
  collinearMove: ['Coup colinéaire', 'Movimiento colineal', '一直線の手', '共线走法', 'एक सीध में चाल', 'Mossa collineare'],
  discoveredCheck: ['Échec à la découverte', 'Jaque a la descubierta', '開き王手', '闪将', 'खुला शह', 'Scacco di scoperta'],
  defensiveMove: ['Coup défensif', 'Movimiento defensivo', '守備の手', '防守着法', 'बचाव की चाल', 'Mossa difensiva'],
  deflection: ['Déviation', 'Desviación', 'そらし', '引离', 'भटकाव', 'Deviazione'],
  interference: ['Interception', 'Interferencia', '遮断', '拦截', 'बीच में रोकना', 'Interferenza'],
  intermezzo: ['Coup intermédiaire', 'Jugada intermedia', '中間手', '中间着', 'बीच की चाल', 'Mossa intermedia'],
  quietMove: ['Coup calme', 'Jugada tranquila', '静かな手', '安静着法', 'शांत चाल', 'Mossa tranquilla'],
  xRayAttack: ['Attaque aux rayons X', 'Ataque de rayos X', 'X線攻撃', 'X光攻击', 'एक्स-रे आक्रमण', 'Attacco a raggi X'],
  zugzwang: ['Zugzwang', 'Zugzwang', 'ツークツワンク', '逼走', 'ज़ुगज़्वांग', 'Zugzwang'],
  opening: ['Ouverture', 'Apertura', 'オープニング', '开局', 'शुरुआत', 'Apertura'],
  middlegame: ['Milieu de partie', 'Medio juego', '中盤', '中局', 'मध्य खेल', 'Mediogioco'],
  endgame: ['Finale', 'Final', '終盤', '残局', 'अंतिम खेल', 'Finale'],
  rookEndgame: ['Finale de tours', 'Final de torres', 'ルークのエンドゲーム', '车残局', 'हाथी का अंतिम खेल', 'Finale di torri'],
  bishopEndgame: ['Finale de fous', 'Final de alfiles', 'ビショップのエンドゲーム', '象残局', 'ऊँट का अंतिम खेल', 'Finale di alfieri'],
  pawnEndgame: ['Finale de pions', 'Final de peones', 'ポーンのエンドゲーム', '兵残局', 'प्यादे का अंतिम खेल', 'Finale di pedoni'],
  knightEndgame: ['Finale de cavaliers', 'Final de caballos', 'ナイトのエンドゲーム', '马残局', 'घोड़े का अंतिम खेल', 'Finale di cavalli'],
  queenEndgame: ['Finale de dames', 'Final de damas', 'クイーンのエンドゲーム', '后残局', 'वज़ीर का अंतिम खेल', 'Finale di donne'],
  queenRookEndgame: ['Finale de dames et tours', 'Final de dama y torre', 'クイーンとルークのエンドゲーム', '后车残局', 'वज़ीर और हाथी का अंतिम खेल', 'Finale di donna e torre'],
  anastasiaMate: ['Mat d’Anastasia', 'Mate de Anastasia', 'アナスタシアのメイト', '阿纳斯塔西娅杀法', 'अनास्तासिया मात', 'Matto di Anastasia'],
  arabianMate: ['Mat arabe', 'Mate árabe', 'アラビアンメイト', '阿拉伯杀法', 'अरबी मात', 'Matto arabo'],
  backRankMate: ['Mat du couloir', 'Mate del pasillo', 'バックランクメイト', '底线杀', 'पिछली पंक्ति की मात', 'Matto del corridoio'],
  balestraMate: ['Mat de Balestra', 'Mate de Balestra', 'バレストラのメイト', '巴莱斯特拉杀法', 'बालेस्त्रा मात', 'Matto di Balestra'],
  blindSwineMate: ['Mat des cochons aveugles', 'Mate de los cerdos ciegos', 'ブラインドスワインメイト', '盲猪杀法', 'ब्लाइंड स्वाइन मात', 'Matto dei maiali ciechi'],
  bodenMate: ['Mat de Boden', 'Mate de Boden', 'ボーデンのメイト', '波登杀法', 'बोडेन मात', 'Matto di Boden'],
  cornerMate: ['Mat du coin', 'Mate de esquina', '隅のメイト', '角落杀', 'कोने की मात', 'Matto d’angolo'],
  doubleBishopMate: ['Mat des deux fous', 'Mate de dos alfiles', 'ダブルビショップメイト', '双象杀', 'दो ऊँटों की मात', 'Matto dei due alfieri'],
  dovetailMate: ['Mat de la queue d’aronde', 'Mate de la cola de milano', 'ダブテイルメイト', '燕尾杀', 'डवटेल मात', 'Matto a coda di rondine'],
  epauletteMate: ['Mat des épaulettes', 'Mate de las charreteras', 'エポレットメイト', '肩章杀', 'एपॉलेट मात', 'Matto delle spalline'],
  hookMate: ['Mat du crochet', 'Mate del gancho', 'フックメイト', '钩子杀', 'हुक मात', 'Matto dell’uncino'],
  killBoxMate: ['Mat de la boîte', 'Mate de la caja', 'キルボックスメイト', '盒式杀', 'किल बॉक्स मात', 'Matto della scatola'],
  pillsburysMate: ['Mat de Pillsbury', 'Mate de Pillsbury', 'ピルズベリーのメイト', '皮尔斯伯里杀法', 'पिल्सबरी मात', 'Matto di Pillsbury'],
  morphysMate: ['Mat de Morphy', 'Mate de Morphy', 'モーフィーのメイト', '莫菲杀法', 'मॉर्फी मात', 'Matto di Morphy'],
  operaMate: ['Mat de l’opéra', 'Mate de la ópera', 'オペラメイト', '歌剧院杀法', 'ओपेरा मात', 'Matto dell’opera'],
  swallowstailMate: ['Mat de la queue d’hirondelle', 'Mate de la cola de golondrina', '燕の尾のメイト', '燕尾式杀法', 'स्वैलोटेल मात', 'Matto a coda di rondine'],
  triangleMate: ['Mat du triangle', 'Mate triangular', 'トライアングルメイト', '三角杀', 'त्रिकोण मात', 'Matto del triangolo'],
  vukovicMate: ['Mat de Vukovic', 'Mate de Vukovic', 'ヴコヴィッチのメイト', '武科维奇杀法', 'वुकोविच मात', 'Matto di Vukovic'],
  smotheredMate: ['Mat à l’étouffée', 'Mate de la coz', '窒息メイト', '闷杀', 'दमघोंटू मात', 'Matto affogato'],
  castling: ['Roque', 'Enroque', 'キャスリング', '王车易位', 'कैसलिंग', 'Arrocco'],
  enPassant: ['Prise en passant', 'Captura al paso', 'アンパッサン', '吃过路兵', 'एन पासाँ', 'Presa en passant'],
  promotion: ['Promotion', 'Promoción', 'プロモーション', '升变', 'पदोन्नति', 'Promozione'],
  underPromotion: ['Sous-promotion', 'Subpromoción', 'アンダープロモーション', '弱升变', 'कमज़ोर पदोन्नति', 'Promozione minore'],
  equality: ['Égalité', 'Igualdad', '互角', '均势', 'बराबरी', 'Parità'],
  advantage: ['Avantage', 'Ventaja', '優勢', '优势', 'बढ़त', 'Vantaggio'],
  crushing: ['Avantage décisif', 'Ventaja decisiva', '圧倒的優勢', '决定性优势', 'निर्णायक बढ़त', 'Vantaggio decisivo'],
  oneMove: ['Un coup', 'Una jugada', '1手', '一步', 'एक चाल', 'Una mossa'],
  short: ['Court', 'Corto', '短い', '短题', 'छोटी', 'Breve'],
  long: ['Long', 'Largo', '長い', '长题', 'लंबी', 'Lungo'],
  veryLong: ['Très long', 'Muy largo', 'とても長い', '超长题', 'बहुत लंबी', 'Molto lungo'],
  master: ['Parties de maîtres', 'Partidas de maestros', 'マスターの対局', '大师对局', 'मास्टर की बाज़ियाँ', 'Partite di maestri'],
  masterVsMaster: ['Maître contre maître', 'Maestro contra maestro', 'マスター同士の対局', '大师对大师', 'मास्टर बनाम मास्टर', 'Maestro contro maestro'],
  superGM: ['Parties de super-GM', 'Partidas de super-GM', 'スーパーGMの対局', '超级特级大师对局', 'सुपर ग्रैंडमास्टर की बाज़ियाँ', 'Partite di super GM'],
}

const groups: Record<Group, Translations> = {
  Checkmates: ['Mats', 'Mates', 'チェックメイト', '将杀', 'मात', 'Scacchi matti'],
  'Tactical motifs': ['Thèmes tactiques', 'Temas tácticos', '戦術のテーマ', '战术主题', 'सामरिक विषय', 'Motivi tattici'],
  'Advanced tactics': ['Tactiques avancées', 'Tácticas avanzadas', '高度な戦術', '高级战术', 'उन्नत रणनीति', 'Tattiche avanzate'],
  'Game phases & endgames': ['Phases et finales', 'Fases y finales', '対局の段階と終盤', '棋局阶段与残局', 'खेल के चरण और अंतिम खेल', 'Fasi di gioco e finali'],
  'Mating patterns': ['Schémas de mat', 'Patrones de mate', 'メイトのパターン', '将杀模式', 'मात के तरीके', 'Schemi di matto'],
  'Special moves': ['Coups spéciaux', 'Movimientos especiales', '特殊な手', '特殊走法', 'विशेष चालें', 'Mosse speciali'],
  Goals: ['Objectifs', 'Objetivos', '目的', '目标', 'लक्ष्य', 'Obiettivi'],
  'Puzzle length': ['Longueur du problème', 'Duración del problema', '問題の手数', '题目长度', 'पहेली की लंबाई', 'Lunghezza del problema'],
  'Player origin': ['Origine des parties', 'Origen de las partidas', '対局の出典', '棋局来源', 'बाज़ियों का स्रोत', 'Origine delle partite'],
}

const indexes: Record<Exclude<Language, 'en'>, number> = { fr: 0, es: 1, ja: 2, zh: 3, hi: 4, it: 5 }

export function themeLabel(id: Category, language: Language): string {
  if (language !== 'en') return themes[id][indexes[language]]
  const category = categories.find((candidate) => candidate.id === id)
  if (!category) throw new Error(`Unknown puzzle theme: ${id}`)
  return category.label
}

export function groupLabel(group: Group, language: Language): string {
  return language === 'en' ? group : groups[group][indexes[language]]
}
