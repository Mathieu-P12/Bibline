/* Livres de la Bible : noms en français (F), anglais (E) et espagnol (S),
   dans l'ordre « long, moyen, court », plus les autres graphies acceptées (a)
   et le nombre de chapitres (c). Repris du module Obsidian « JW Library Linker »
   (github.com/msakowski/obsidian-library-linker, licence Apache 2.0).
   Ce tableau est lu par app.js ; il doit être chargé avant lui. */
const BIBLE_BOOKS = [
  {"n":{"F":["Genèse","Gen.","Gn"],"E":["Genesis","Gen.","Ge"],"S":["Génesis","Gén.","Gé"]},"a":["genesis"],"c":50},  // 1. Genèse
  {"n":{"F":["Exode","Ex.","Ex"],"E":["Exodus","Ex.","Ex"],"S":["Éxodo","Éx.","Éx"]},"a":["exodo"],"c":40},  // 2. Exode
  {"n":{"F":["Lévitique","Lév.","Lv"],"E":["Leviticus","Le.","Le"],"S":["Levítico","Lev.","Le"]},"a":["levitico"],"c":27},  // 3. Lévitique
  {"n":{"F":["Nombres","Nomb.","Nb"],"E":["Numbers","Nu.","Nu"],"S":["Números","Núm.","Nú"]},"a":["numeros"],"c":36},  // 4. Nombres
  {"n":{"F":["Deutéronome","Deut.","Dt"],"E":["Deuteronomy","Deut.","De"],"S":["Deuteronomio","Deut.","Dt"]},"a":[],"c":34},  // 5. Deutéronome
  {"n":{"F":["Josué","Jos.","Jos"],"E":["Joshua","Jos.","Jos"],"S":["Josué","Jos.","Jos"]},"a":["josue"],"c":24},  // 6. Josué
  {"n":{"F":["Juges","Juges","Jg"],"E":["Judges","Jg.","Jg"],"S":["Jueces","Juec.","Jue"]},"a":[],"c":21},  // 7. Juges
  {"n":{"F":["Ruth","Ruth","Ru"],"E":["Ruth","Ru.","Ru"],"S":["Rut","Rut","Rut"]},"a":[],"c":4},  // 8. Ruth
  {"n":{"F":["1 Samuel","1 Sam.","1S"],"E":["1 Samuel","1 Sam.","1Sa"],"S":["1 Samuel","1 Sam.","1Sa"]},"a":[],"c":31},  // 9. 1 Samuel
  {"n":{"F":["2 Samuel","2 Sam.","2S"],"E":["2 Samuel","2 Sa.","2Sa"],"S":["2 Samuel","2 Sam.","2Sa"]},"a":[],"c":24},  // 10. 2 Samuel
  {"n":{"F":["1 Rois","1 Rois","1R"],"E":["1 Kings","1 Ki.","1Ki"],"S":["1 Reyes","1 Rey.","1Re"]},"a":[],"c":22},  // 11. 1 Rois
  {"n":{"F":["2 Rois","2 Rois","2R"],"E":["2 Kings","2 Ki.","2Ki"],"S":["2 Reyes","2 Rey.","2Re"]},"a":[],"c":25},  // 12. 2 Rois
  {"n":{"F":["1 Chroniques","1 Chron.","1Ch"],"E":["1 Chronicles","1 Ch.","1Ch"],"S":["1 Crónicas","1 Crón.","1Cr"]},"a":["1 cronicas"],"c":29},  // 13. 1 Chroniques
  {"n":{"F":["2 Chroniques","2 Chron.","2Ch"],"E":["2 Chronicles","2 Ch.","2Ch"],"S":["2 Crónicas","2 Crón.","2Cr"]},"a":["2 cronicas"],"c":36},  // 14. 2 Chroniques
  {"n":{"F":["Esdras","Esd.","Esd"],"E":["Ezra","Ezra","Ezr"],"S":["Esdras","Esd.","Esd"]},"a":[],"c":10},  // 15. Esdras
  {"n":{"F":["Néhémie","Néh.","Né"],"E":["Nehemiah","Ne.","Ne"],"S":["Nehemías","Neh.","Ne"]},"a":["nehemias"],"c":13},  // 16. Néhémie
  {"n":{"F":["Esther","Est.","Est"],"E":["Esther","Es.","Es"],"S":["Ester","Est.","Est"]},"a":[],"c":10},  // 17. Esther
  {"n":{"F":["Job","Job","Jb"],"E":["Job","Job","Job"],"S":["Job","Job","Job"]},"a":[],"c":42},  // 18. Job
  {"n":{"F":["Psaumes","Ps.","Ps"],"E":["Psalms","Ps.","Ps"],"S":["Salmos","Sal.","Sl"]},"a":[],"c":150},  // 19. Psaumes
  {"n":{"F":["Proverbes","Prov.","Pr"],"E":["Proverbs","Prov.","Pr"],"S":["Proverbios","Prov.","Pr"]},"a":[],"c":31},  // 20. Proverbes
  {"n":{"F":["Ecclésiaste","Eccl.","Ec"],"E":["Ecclesiastes","Eccl.","Ec"],"S":["Eclesiastés","Ecl.","Ec"]},"a":["eclesiastes"],"c":12},  // 21. Ecclésiaste
  {"n":{"F":["Chant de Salomon","Chant de S.","Ct"],"E":["Song of Solomon","Song of Sol.","Ca"],"S":["El Cantar de los Cantares","Cant.","Can"]},"a":["can","cantares","songofsongs"],"c":8},  // 22. Chant de Salomon
  {"n":{"F":["Isaïe","Is.","Is"],"E":["Isaiah","Isa.","Isa"],"S":["Isaías","Is.","Is"]},"a":["isaias"],"c":66},  // 23. Isaïe
  {"n":{"F":["Jérémie","Jér.","Jr"],"E":["Jeremiah","Jer.","Jer"],"S":["Jeremías","Jer.","Jer"]},"a":["jeremias"],"c":52},  // 24. Jérémie
  {"n":{"F":["Lamentations","Lam.","Lm"],"E":["Lamentations","La.","La"],"S":["Lamentaciones","Lam.","Lam"]},"a":[],"c":5},  // 25. Lamentations
  {"n":{"F":["Ézéchiel","Ézéch.","Éz"],"E":["Ezekiel","Eze.","Eze"],"S":["Ezequiel","Ezeq.","Eze"]},"a":[],"c":48},  // 26. Ézéchiel
  {"n":{"F":["Daniel","Dan.","Dn"],"E":["Daniel","Da.","Da"],"S":["Daniel","Dan.","Da"]},"a":[],"c":12},  // 27. Daniel
  {"n":{"F":["Osée","Osée","Os"],"E":["Hosea","Ho.","Ho"],"S":["Oseas","Os.","Os"]},"a":[],"c":14},  // 28. Osée
  {"n":{"F":["Joël","Joël","Jl"],"E":["Joel","Joel","Joe"],"S":["Joel","Joel","Joe"]},"a":[],"c":3},  // 29. Joël
  {"n":{"F":["Amos","Amos","Am"],"E":["Amos","Am.","Am"],"S":["Amós","Amós","Am"]},"a":["amos"],"c":9},  // 30. Amos
  {"n":{"F":["Abdias","Abd.","Ab"],"E":["Obadiah","Ob.","Ob"],"S":["Abdías","Abd.","Abd"]},"a":["abdias"],"c":1},  // 31. Abdias
  {"n":{"F":["Jonas","Jon.","Jon"],"E":["Jonah","Jon.","Jon"],"S":["Jonás","Jon.","Jon"]},"a":["jnh","jonas"],"c":4},  // 32. Jonas
  {"n":{"F":["Michée","Mich.","Mi"],"E":["Micah","Mic.","Mic"],"S":["Miqueas","Miq.","Miq"]},"a":[],"c":7},  // 33. Michée
  {"n":{"F":["Nahum","Nah.","Na"],"E":["Nahum","Na.","Na"],"S":["Nahúm","Nah.","Na"]},"a":["nahum"],"c":3},  // 34. Nahum
  {"n":{"F":["Habacuc","Hab.","Hab"],"E":["Habakkuk","Hab.","Hab"],"S":["Habacuc","Hab.","Hab"]},"a":[],"c":3},  // 35. Habacuc
  {"n":{"F":["Sophonie","Soph.","Sph"],"E":["Zephaniah","Zep.","Zep"],"S":["Sofonías","Sof.","Sof"]},"a":["sofonias"],"c":3},  // 36. Sophonie
  {"n":{"F":["Aggée","Agg.","Ag"],"E":["Haggai","Hag.","Hag"],"S":["Ageo","Ageo","Ag"]},"a":[],"c":2},  // 37. Aggée
  {"n":{"F":["Zacharie","Zach.","Za"],"E":["Zechariah","Zec.","Zec"],"S":["Zacarías","Zac.","Zac"]},"a":["zacarias"],"c":14},  // 38. Zacharie
  {"n":{"F":["Malachie","Mal.","Ml"],"E":["Malachi","Mal.","Mal"],"S":["Malaquías","Mal.","Mal"]},"a":["malaquias"],"c":4},  // 39. Malachie
  {"n":{"F":["Matthieu","Mat.","Mt"],"E":["Matthew","Matt.","Mt"],"S":["Mateo","Mat.","Mt"]},"a":[],"c":28},  // 40. Matthieu
  {"n":{"F":["Marc","Marc","Mc"],"E":["Mark","Mark","Mr"],"S":["Marcos","Mar.","Mr"]},"a":[],"c":16},  // 41. Marc
  {"n":{"F":["Luc","Luc","Lc"],"E":["Luke","Luke","Lu"],"S":["Lucas","Luc.","Lu"]},"a":[],"c":24},  // 42. Luc
  {"n":{"F":["Jean","Jean","Jean"],"E":["John","John","Joh"],"S":["Juan","Juan","Jn"]},"a":[],"c":21},  // 43. Jean
  {"n":{"F":["Actes","Actes","Ac"],"E":["Acts","Acts","Ac"],"S":["Hechos","Hech.","Hch"]},"a":[],"c":28},  // 44. Actes
  {"n":{"F":["Romains","Rom.","Rm"],"E":["Romans","Rom.","Ro"],"S":["Romanos","Rom.","Ro"]},"a":[],"c":16},  // 45. Romains
  {"n":{"F":["1 Corinthiens","1 Cor.","1Co"],"E":["1 Corinthians","1 Cor.","1Co"],"S":["1 Corintios","1 Cor.","1Co"]},"a":[],"c":16},  // 46. 1 Corinthiens
  {"n":{"F":["2 Corinthiens","2 Cor.","2Co"],"E":["2 Corinthians","2 Cor.","2Co"],"S":["2 Corintios","2 Cor.","2Co"]},"a":[],"c":13},  // 47. 2 Corinthiens
  {"n":{"F":["Galates","Gal.","Ga"],"E":["Galatians","Gal.","Ga"],"S":["Gálatas","Gál.","Gál"]},"a":["galatas"],"c":6},  // 48. Galates
  {"n":{"F":["Éphésiens","Éph.","Éph"],"E":["Ephesians","Eph.","Eph"],"S":["Efesios","Efes.","Ef"]},"a":[],"c":6},  // 49. Éphésiens
  {"n":{"F":["Philippiens","Phil.","Php"],"E":["Philippians","Phil.","Php"],"S":["Filipenses","Filip.","Flp"]},"a":[],"c":4},  // 50. Philippiens
  {"n":{"F":["Colossiens","Col.","Col"],"E":["Colossians","Col.","Col"],"S":["Colosenses","Col.","Col"]},"a":[],"c":4},  // 51. Colossiens
  {"n":{"F":["1 Thessaloniciens","1 Thess.","1Th"],"E":["1 Thessalonians","1 Thess.","1Th"],"S":["1 Tesalonicenses","1 Tes.","1Te"]},"a":[],"c":5},  // 52. 1 Thessaloniciens
  {"n":{"F":["2 Thessaloniciens","2 Thess.","2Th"],"E":["2 Thessalonians","2 Thess.","2Th"],"S":["2 Tesalonicenses","2 Tes.","2Te"]},"a":[],"c":3},  // 53. 2 Thessaloniciens
  {"n":{"F":["1 Timothée","1 Tim.","1Tm"],"E":["1 Timothy","1 Tim.","1Ti"],"S":["1 Timoteo","1 Tim.","1Ti"]},"a":[],"c":6},  // 54. 1 Timothée
  {"n":{"F":["2 Timothée","2 Tim.","2Tm"],"E":["2 Timothy","2 Tim.","2Ti"],"S":["2 Timoteo","2 Tim.","2Ti"]},"a":[],"c":4},  // 55. 2 Timothée
  {"n":{"F":["Tite","Tite","Tt"],"E":["Titus","Tit.","Tit"],"S":["Tito","Tito","Tit"]},"a":[],"c":3},  // 56. Tite
  {"n":{"F":["Philémon","Philém.","Phm"],"E":["Philemon","Phil.","Phm"],"S":["Filemón","Filem.","Flm"]},"a":["filemon"],"c":1},  // 57. Philémon
  {"n":{"F":["Hébreux","Héb.","Hé"],"E":["Hebrews","Heb.","Heb"],"S":["Hebreos","Heb.","Heb"]},"a":[],"c":13},  // 58. Hébreux
  {"n":{"F":["Jacques","Jacq.","Jc"],"E":["James","Jas.","Jas"],"S":["Santiago","Sant.","Snt"]},"a":[],"c":5},  // 59. Jacques
  {"n":{"F":["1 Pierre","1 Pierre","1P"],"E":["1 Peter","1 Pet.","1Pe"],"S":["1 Pedro","1 Ped.","1Pe"]},"a":[],"c":5},  // 60. 1 Pierre
  {"n":{"F":["2 Pierre","2 Pierre","2P"],"E":["2 Peter","2 Pet.","2Pe"],"S":["2 Pedro","2 Ped.","2Pe"]},"a":[],"c":3},  // 61. 2 Pierre
  {"n":{"F":["1 Jean","1 Jean","1J"],"E":["1 John","1 Jo.","1Jo"],"S":["1 Juan","1 Juan","1Jn"]},"a":[],"c":5},  // 62. 1 Jean
  {"n":{"F":["2 Jean","2 Jean","2J"],"E":["2 John","2 Jo.","2Jo"],"S":["2 Juan","2 Juan","2Jn"]},"a":[],"c":1},  // 63. 2 Jean
  {"n":{"F":["3 Jean","3 Jean","3J"],"E":["3 John","3 Jo.","3Jo"],"S":["3 Juan","3 Juan","3Jn"]},"a":[],"c":1},  // 64. 3 Jean
  {"n":{"F":["Jude","Jude","Jude"],"E":["Jude","Jude","Jude"],"S":["Judas","Jud.","Jud"]},"a":[],"c":1},  // 65. Jude
  {"n":{"F":["Révélation","Rév.","Ré"],"E":["Revelation","Rev.","Re"],"S":["Apocalipsis","Apoc.","Ap"]},"a":[],"c":22}  // 66. Révélation
];
