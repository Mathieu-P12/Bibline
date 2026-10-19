/* ============================================================================
   Bibline — Mode édition (edition.js)
   ----------------------------------------------------------------------------
   Ce fichier ajoute à Bibline la fenêtre « Mode édition » : on y compose une
   vue de la frise (période, catégories, éléments masqués, images, zones
   « compressées »), puis on l'exporte en PDF, PNG ou JPG. Il ne connaît de
   l'application que ce que lui transmet app.js par la méthode init() (section
   « Mode édition » de app.js) : il ne modifie jamais les événements, les
   périodes ni les catégories, il ne fait que les lire.

   La planche exportée est dessinée ici, dans un canevas, en « unités de
   conception » (la largeur de la feuille vaut toujours 1000) : l'aperçu et
   l'export utilisent exactement le même dessin, seule la taille change.

   Les réglages du mode édition sont gardés sur l'appareil (clé « bibline-edition »
   du stockage local), à part des réglages de l'application.
============================================================================ */
(function(){
'use strict';

const STORE_KEY = 'bibline-edition';        // réglages du mode édition (ne pas renommer : ils seraient perdus sans message)
const SEEN_KEY  = 'bibline-edition-vu';     // la pastille « nouveau » du bouton a déjà été vue
const YMIN = -6000, YMAX = 2090;            // bornes des dates de début / de fin de la planche
const MIN_SPAN = 10;                        // durée minimale de la période affichée (années)

/* ============================================================================
   1. TEXTES (français, anglais, espagnol, chinois)
   ----------------------------------------------------------------------------
   Les noms de catégories et les titres d'éléments viennent de l'application
   telle que la personne l'a remplie : ils ne sont jamais traduits ici.
============================================================================ */
const pl = (n, one, many) => n > 1 ? many : one;       // pluriel français / anglais / espagnol : « 0 et 1 » restent au singulier

const TS = {
  fr:{
    title:"Mode édition", subtitle:"Composez une vue de la frise, puis exportez-la en PDF ou en image.",
    close:"Fermer", rail:"Édition", railTitle:"Mode édition : exporter la frise en PDF ou en image",
    fit:"Ajusté", zoom:"Zoom", export:"Exporter", cancelPlace:"Annuler la pose",
    previewAria:"Aperçu de la planche à exporter", sizeAria:"Taille de l’aperçu",
    tapCoarse:"Touchez", tapFine:"Cliquez sur",
    hintHide:v=>`${v} une fiche ou une barre pour la masquer.`,
    hintA:v=>`${v} la frise : début du pli.`,
    hintB:(v,d)=>`Début : ${d} — ${v.toLowerCase()} la fin.`,
    secPeriod:"Période", secCats:"Catégories", secItems:"Éléments", secImages:"Images",
    secComps:"Compressions", secLayout:"Mise en page", secExport:"Export",
    from:"Début", to:"Fin", bceBtn:"av. n. è.", ceBtn:"de n. è.",
    yearAria:l=>`${l} : année`, eraAria:l=>`${l} : ère`,
    presetAll:"Tout", presetView:"Vue actuelle", presetsAria:"Périodes prédéfinies",
    errStart:(a,b)=>`Le début doit se situer entre ${a} et ${b}.`,
    errEnd:(a,b)=>`La fin doit se situer entre ${a} et ${b}.`,
    errSpan:n=>`La période doit couvrir au moins ${n} ans.`,
    catsAria:"Catégories à afficher", catsAll:"Toutes", catsNone:"Aucune", catsSync:"Comme la frise",
    periodsOn:"Afficher les périodes (barres)",
    search:"Rechercher", searchAria:"Rechercher un élément", showAll:"Tout afficher",
    tagPeriod:"période", tagFold:"dans un pli", tagFoldTitle:"Masqué par une compression",
    listEmpty:"Aucun élément dans cette période avec ces catégories.", listNoMatch:"Aucun élément ne correspond à cette recherche.",
    showAria:t=>`Afficher « ${t} »`,
    noteItems:n=>`${n} élément${pl(n,'','s')} dans la période`, noteHidden:n=>`${n} masqué${pl(n,'','s')}`,
    noteFold:n=>`${n} dans un pli`,
    noteDense:n=>`${n} sans fiche : zone trop dense. Masquez-en, coupez les images ou compressez un vide.`,
    noteLost:n=>`${n} période${pl(n,'','s')} sans place : masquez-en ou réduisez la période.`,
    cDots:n=>`${n} sans fiche`, cDotsTitle:"Zone trop dense : ces éléments sont réduits à un simple point, sans fiche.",
    cLost:n=>`${n} période${pl(n,'','s')} sans place`, cImgFail:n=>`${n} image${pl(n,'','s')} indisponible${pl(n,'','s')}`,
    imgOn:"Afficher les images",
    imgNote:"Les images sont celles des fiches. Elles sont chargées depuis leur adresse : sans connexion, ou si le site refuse l’accès, la fiche est exportée sans image.",
    imgStatus:(ok,n)=>`${ok} / ${n} image${pl(n,'','s')} chargée${pl(n,'','s')}`, imgLoading:"Chargement des images…",
    imgNone:"Aucune image à charger avec ces réglages.", imgRetry:"Réessayer le chargement",
    compNote:"Une compression remplace une période creuse par un pli de largeur fixe. Les deux dates qui l’encadrent restent lisibles ; les éléments qu’elle contient sont masqués.",
    compNone:"Aucune compression : l’échelle de temps est proportionnelle.",
    compAdd:"Ajouter (suggestion)", compPlace:"Poser sur la frise", compPlaceStop:"Annuler la pose", compClear:"Tout retirer",
    compWidth:"Largeur des plis", widths:["Fins","Moyens","Larges","Très larges"],
    compN:i=>`Pli ${i}`, compDel:"Supprimer", compDelAria:i=>`Supprimer le pli ${i}`,
    compFrom:"De", compTo:"À", compYears:n=>`${n} ans`, compOut:"hors période", compCrop:"rognée",
    errInvalid:"Dates invalides.", errShort:"La fin doit suivre le début d’au moins 2 ans.",
    errRange:"La zone doit rester dans la période affichée.", errOverlap:"Cette zone chevauche une autre compression.",
    toastNoGap:"Aucun grand vide à compresser avec ces réglages.",
    toastFoldPlaced:(a,b)=>`Pli posé : ${a} → ${b}`, toastFoldAdded:(a,b)=>`Pli ajouté : ${a} → ${b}`,
    toastFoldDeleted:"Pli supprimé.", toastFoldsCleared:"Compressions retirées.",
    toastHidden:t=>`« ${t} » masqué.`, undo:"Annuler",
    docTitle:"Titre", titlePh:"Frise chronologique", defaultTitle:"Frise chronologique", format:"Format",
    legend:"Légende des catégories",
    fmt:{a4l:"A4 paysage", a3l:"A3 paysage", hd:"Écran 16:9"},
    quality:"Qualité de l’export", qStd:"Standard", qHi:"Haute définition",
    expInfo:(w,h,dpi,f)=>`${w} × ${h} px${dpi?` · ${dpi} dpi`:''} · ${f}`,
    expPdf:"PDF", expPng:"PNG", expJpg:"JPG",
    expPdfNote:"Le PDF contient une page unique à la taille du format choisi : la planche y est une image haute définition, le texte n’y est donc pas sélectionnable.",
    generating:"Génération…", resultTitle:"Fichier prêt", btnSave:"Enregistrer", btnShare:"Partager",
    toastDownloaded:n=>`Fichier téléchargé : ${n}`, toastReady:"Fichier prêt : touchez Enregistrer ou Partager.",
    errExport:m=>`Export impossible : ${m}.`, errBig:"image trop grande pour cet appareil, essayez la qualité Standard",
    errUnexpected:"erreur inattendue",
    imgFailed:n=>`${n} image${pl(n,'','s')} indisponible${pl(n,'','s')} : fiche${pl(n,'','s')} exportée${pl(n,'','s')} sans image.`,
    reset:"Réinitialiser", resetConfirm:"Confirmer la réinitialisation", toastReset:"Réglages du mode édition réinitialisés.",
    sumHidden:n=>`${n} masqué${pl(n,'','s')}`, sumAllVisible:"tous visibles", sumOn:"activées", sumOff:"désactivées",
    sumNone:"aucun", sumFolds:n=>`${n} pli${pl(n,'','s')}`,
    sheetEvents:n=>`${n} événement${pl(n,'','s')}`, sheetPeriods:n=>`${n} période${pl(n,'','s')}`,
    sheetEmpty:"Aucun élément à afficher avec ces réglages.",
    sheetFoldNote:"Les zones plissées condensent le temps : échelle non proportionnelle",
    sheetYears:n=>`${n} ans`, approx:"vers ",
    yFull:(n,bce)=>bce?`${n} av. n. è.`:(n<1000?`${n} de n. è.`:`${n}`),
    eraTag:bce=>bce?'av. n. è.':'de n. è.', tickEra:(n,bce)=>`${n} ${bce?'av. n. è.':'de n. è.'}`, mergeRange:true,
    unitK:"Ko", unitM:"Mo", dec:",", arrow:"→",
  },
  en:{
    title:"Edit mode", subtitle:"Compose a view of the timeline, then export it as a PDF or an image.",
    close:"Close", rail:"Edit", railTitle:"Edit mode: export the timeline as a PDF or an image",
    fit:"Fit", zoom:"Zoom", export:"Export", cancelPlace:"Cancel placing",
    previewAria:"Preview of the sheet to export", sizeAria:"Preview size",
    tapCoarse:"Tap", tapFine:"Click",
    hintHide:v=>`${v} a card or a bar to hide it.`,
    hintA:v=>`${v} the timeline: start of the fold.`,
    hintB:(v,d)=>`Start: ${d} — ${v.toLowerCase()} the end.`,
    secPeriod:"Period", secCats:"Categories", secItems:"Items", secImages:"Images",
    secComps:"Compressions", secLayout:"Layout", secExport:"Export",
    from:"Start", to:"End", bceBtn:"BCE", ceBtn:"CE",
    yearAria:l=>`${l}: year`, eraAria:l=>`${l}: era`,
    presetAll:"All", presetView:"Current view", presetsAria:"Preset periods",
    errStart:(a,b)=>`The start must be between ${a} and ${b}.`,
    errEnd:(a,b)=>`The end must be between ${a} and ${b}.`,
    errSpan:n=>`The period must cover at least ${n} years.`,
    catsAria:"Categories to show", catsAll:"All", catsNone:"None", catsSync:"Same as timeline",
    periodsOn:"Show periods (bars)",
    search:"Search", searchAria:"Search an item", showAll:"Show all",
    tagPeriod:"period", tagFold:"in a fold", tagFoldTitle:"Hidden by a compression",
    listEmpty:"No item in this period with these categories.", listNoMatch:"No item matches this search.",
    showAria:t=>`Show “${t}”`,
    noteItems:n=>`${n} item${pl(n,'','s')} in the period`, noteHidden:n=>`${n} hidden`,
    noteFold:n=>`${n} in a fold`,
    noteDense:n=>`${n} without a card: area too crowded. Hide some, turn images off or compress a gap.`,
    noteLost:n=>`${n} period${pl(n,'','s')} without room: hide some or shorten the period.`,
    cDots:n=>`${n} without a card`, cDotsTitle:"Area too crowded: these items are reduced to a plain dot, without a card.",
    cLost:n=>`${n} period${pl(n,'','s')} without room`, cImgFail:n=>`${n} image${pl(n,'','s')} unavailable`,
    imgOn:"Show images",
    imgNote:"Images are the ones from the entries. They are loaded from their address: offline, or if the site refuses access, the card is exported without an image.",
    imgStatus:(ok,n)=>`${ok} / ${n} image${pl(n,'','s')} loaded`, imgLoading:"Loading images…",
    imgNone:"No image to load with these settings.", imgRetry:"Retry loading",
    compNote:"A compression replaces an empty stretch of time with a fold of fixed width. The two dates around it stay readable; the items it contains are hidden.",
    compNone:"No compression: the time scale is proportional.",
    compAdd:"Add (suggestion)", compPlace:"Place on timeline", compPlaceStop:"Cancel placing", compClear:"Remove all",
    compWidth:"Fold width", widths:["Thin","Medium","Wide","Very wide"],
    compN:i=>`Fold ${i}`, compDel:"Delete", compDelAria:i=>`Delete fold ${i}`,
    compFrom:"From", compTo:"To", compYears:n=>`${n} years`, compOut:"outside period", compCrop:"cropped",
    errInvalid:"Invalid dates.", errShort:"The end must be at least 2 years after the start.",
    errRange:"The area must stay within the displayed period.", errOverlap:"This area overlaps another compression.",
    toastNoGap:"No large gap to compress with these settings.",
    toastFoldPlaced:(a,b)=>`Fold placed: ${a} → ${b}`, toastFoldAdded:(a,b)=>`Fold added: ${a} → ${b}`,
    toastFoldDeleted:"Fold deleted.", toastFoldsCleared:"Compressions removed.",
    toastHidden:t=>`“${t}” hidden.`, undo:"Undo",
    docTitle:"Title", titlePh:"Timeline", defaultTitle:"Timeline", format:"Format",
    legend:"Category legend",
    fmt:{a4l:"A4 landscape", a3l:"A3 landscape", hd:"Screen 16:9"},
    quality:"Export quality", qStd:"Standard", qHi:"High definition",
    expInfo:(w,h,dpi,f)=>`${w} × ${h} px${dpi?` · ${dpi} dpi`:''} · ${f}`,
    expPdf:"PDF", expPng:"PNG", expJpg:"JPG",
    expPdfNote:"The PDF has a single page the size of the chosen format: the sheet is a high-definition image in it, so the text cannot be selected.",
    generating:"Generating…", resultTitle:"File ready", btnSave:"Save", btnShare:"Share",
    toastDownloaded:n=>`File downloaded: ${n}`, toastReady:"File ready: tap Save or Share.",
    errExport:m=>`Export failed: ${m}.`, errBig:"image too large for this device, try Standard quality",
    errUnexpected:"unexpected error",
    imgFailed:n=>`${n} image${pl(n,'','s')} unavailable: the card${pl(n,'','s')} exported without an image.`,
    reset:"Reset", resetConfirm:"Confirm reset", toastReset:"Edit mode settings reset.",
    sumHidden:n=>`${n} hidden`, sumAllVisible:"all visible", sumOn:"on", sumOff:"off",
    sumNone:"none", sumFolds:n=>`${n} fold${pl(n,'','s')}`,
    sheetEvents:n=>`${n} event${pl(n,'','s')}`, sheetPeriods:n=>`${n} period${pl(n,'','s')}`,
    sheetEmpty:"Nothing to show with these settings.",
    sheetFoldNote:"Folded areas compress time: the scale is not proportional",
    sheetYears:n=>`${n} yrs`, approx:"c. ",
    yFull:(n,bce)=>bce?`${n} BCE`:(n<1000?`${n} CE`:`${n}`),
    eraTag:bce=>bce?'BCE':'CE', tickEra:(n,bce)=>`${n} ${bce?'BCE':'CE'}`, mergeRange:true,
    unitK:"KB", unitM:"MB", dec:".", arrow:"→",
  },
  es:{
    title:"Modo edición", subtitle:"Componga una vista de la línea de tiempo y expórtela en PDF o como imagen.",
    close:"Cerrar", rail:"Edición", railTitle:"Modo edición: exportar la línea de tiempo en PDF o imagen",
    fit:"Ajustado", zoom:"Zoom", export:"Exportar", cancelPlace:"Cancelar colocación",
    previewAria:"Vista previa de la lámina a exportar", sizeAria:"Tamaño de la vista previa",
    tapCoarse:"Toca", tapFine:"Haz clic en",
    hintHide:v=>`${v} una ficha o una barra para ocultarla.`,
    hintA:v=>`${v} la línea de tiempo: inicio del pliegue.`,
    hintB:(v,d)=>`Inicio: ${d} — ${v.toLowerCase()} el final.`,
    secPeriod:"Periodo", secCats:"Categorías", secItems:"Elementos", secImages:"Imágenes",
    secComps:"Compresiones", secLayout:"Diseño", secExport:"Exportar",
    from:"Inicio", to:"Fin", bceBtn:"a. C.", ceBtn:"d. C.",
    yearAria:l=>`${l}: año`, eraAria:l=>`${l}: era`,
    presetAll:"Todo", presetView:"Vista actual", presetsAria:"Periodos predefinidos",
    errStart:(a,b)=>`El inicio debe estar entre ${a} y ${b}.`,
    errEnd:(a,b)=>`El fin debe estar entre ${a} y ${b}.`,
    errSpan:n=>`El periodo debe abarcar al menos ${n} años.`,
    catsAria:"Categorías que mostrar", catsAll:"Todas", catsNone:"Ninguna", catsSync:"Como la línea",
    periodsOn:"Mostrar los periodos (barras)",
    search:"Buscar", searchAria:"Buscar un elemento", showAll:"Mostrar todo",
    tagPeriod:"periodo", tagFold:"en un pliegue", tagFoldTitle:"Oculto por una compresión",
    listEmpty:"Ningún elemento en este periodo con estas categorías.", listNoMatch:"Ningún elemento coincide con la búsqueda.",
    showAria:t=>`Mostrar «${t}»`,
    noteItems:n=>`${n} elemento${pl(n,'','s')} en el periodo`, noteHidden:n=>`${n} oculto${pl(n,'','s')}`,
    noteFold:n=>`${n} en un pliegue`,
    noteDense:n=>`${n} sin ficha: zona demasiado densa. Oculte algunos, quite las imágenes o comprima un vacío.`,
    noteLost:n=>`${n} periodo${pl(n,'','s')} sin sitio: oculte algunos o reduzca el periodo.`,
    cDots:n=>`${n} sin ficha`, cDotsTitle:"Zona demasiado densa: estos elementos se reducen a un simple punto, sin ficha.",
    cLost:n=>`${n} periodo${pl(n,'','s')} sin sitio`, cImgFail:n=>n>1?`${n} imágenes no disponibles`:'1 imagen no disponible',
    imgOn:"Mostrar las imágenes",
    imgNote:"Las imágenes son las de las fichas. Se cargan desde su dirección: sin conexión, o si el sitio rechaza el acceso, la ficha se exporta sin imagen.",
    imgStatus:(ok,n)=>`${ok} / ${n} ${n>1?'imágenes cargadas':'imagen cargada'}`, imgLoading:"Cargando imágenes…",
    imgNone:"Ninguna imagen que cargar con estos ajustes.", imgRetry:"Reintentar la carga",
    compNote:"Una compresión sustituye un tramo vacío por un pliegue de ancho fijo. Las dos fechas que lo enmarcan siguen legibles; los elementos que contiene se ocultan.",
    compNone:"Ninguna compresión: la escala de tiempo es proporcional.",
    compAdd:"Añadir (sugerencia)", compPlace:"Colocar en la línea", compPlaceStop:"Cancelar colocación", compClear:"Quitar todas",
    compWidth:"Ancho de los pliegues", widths:["Finos","Medios","Anchos","Muy anchos"],
    compN:i=>`Pliegue ${i}`, compDel:"Eliminar", compDelAria:i=>`Eliminar el pliegue ${i}`,
    compFrom:"De", compTo:"A", compYears:n=>`${n} años`, compOut:"fuera del periodo", compCrop:"recortado",
    errInvalid:"Fechas no válidas.", errShort:"El final debe seguir al inicio al menos 2 años.",
    errRange:"La zona debe quedar dentro del periodo mostrado.", errOverlap:"Esta zona se solapa con otra compresión.",
    toastNoGap:"Ningún gran vacío que comprimir con estos ajustes.",
    toastFoldPlaced:(a,b)=>`Pliegue colocado: ${a} → ${b}`, toastFoldAdded:(a,b)=>`Pliegue añadido: ${a} → ${b}`,
    toastFoldDeleted:"Pliegue eliminado.", toastFoldsCleared:"Compresiones quitadas.",
    toastHidden:t=>`«${t}» oculto.`, undo:"Deshacer",
    docTitle:"Título", titlePh:"Línea de tiempo", defaultTitle:"Línea de tiempo", format:"Formato",
    legend:"Leyenda de las categorías",
    fmt:{a4l:"A4 horizontal", a3l:"A3 horizontal", hd:"Pantalla 16:9"},
    quality:"Calidad de la exportación", qStd:"Estándar", qHi:"Alta definición",
    expInfo:(w,h,dpi,f)=>`${w} × ${h} px${dpi?` · ${dpi} ppp`:''} · ${f}`,
    expPdf:"PDF", expPng:"PNG", expJpg:"JPG",
    expPdfNote:"El PDF contiene una sola página del tamaño del formato elegido: la lámina es una imagen de alta definición, así que el texto no se puede seleccionar.",
    generating:"Generando…", resultTitle:"Archivo listo", btnSave:"Guardar", btnShare:"Compartir",
    toastDownloaded:n=>`Archivo descargado: ${n}`, toastReady:"Archivo listo: toca Guardar o Compartir.",
    errExport:m=>`No se pudo exportar: ${m}.`, errBig:"imagen demasiado grande para este dispositivo, pruebe la calidad Estándar",
    errUnexpected:"error inesperado",
    imgFailed:n=>`${n>1?`${n} imágenes no disponibles: fichas exportadas`:'1 imagen no disponible: ficha exportada'} sin imagen.`,
    reset:"Restablecer", resetConfirm:"Confirmar el restablecimiento", toastReset:"Ajustes del modo edición restablecidos.",
    sumHidden:n=>`${n} oculto${pl(n,'','s')}`, sumAllVisible:"todos visibles", sumOn:"activadas", sumOff:"desactivadas",
    sumNone:"ninguno", sumFolds:n=>`${n} pliegue${pl(n,'','s')}`,
    sheetEvents:n=>`${n} evento${pl(n,'','s')}`, sheetPeriods:n=>`${n} periodo${pl(n,'','s')}`,
    sheetEmpty:"Nada que mostrar con estos ajustes.",
    sheetFoldNote:"Las zonas plegadas condensan el tiempo: escala no proporcional",
    sheetYears:n=>`${n} años`, approx:"c. ",
    yFull:(n,bce)=>bce?`${n} a. C.`:(n<1000?`${n} d. C.`:`${n}`),
    eraTag:bce=>bce?'a. C.':'d. C.', tickEra:(n,bce)=>`${n} ${bce?'a. C.':'d. C.'}`, mergeRange:true,
    unitK:"KB", unitM:"MB", dec:",", arrow:"→",
  },
  zh:{
    title:"编辑模式", subtitle:"编排时间线的一个视图，然后导出为 PDF 或图片。",
    close:"关闭", rail:"编辑", railTitle:"编辑模式：将时间线导出为 PDF 或图片",
    fit:"适应", zoom:"放大", export:"导出", cancelPlace:"取消放置",
    previewAria:"待导出页面的预览", sizeAria:"预览大小",
    tapCoarse:"点按", tapFine:"点击",
    hintHide:v=>`${v}卡片或条形即可隐藏。`,
    hintA:v=>`${v}时间线：折叠区的起点。`,
    hintB:(v,d)=>`起点：${d} — 再${v}终点。`,
    secPeriod:"时间范围", secCats:"分类", secItems:"条目", secImages:"图片",
    secComps:"压缩", secLayout:"版面", secExport:"导出",
    from:"起", to:"止", bceBtn:"公元前", ceBtn:"公元",
    yearAria:l=>`${l}：年份`, eraAria:l=>`${l}：纪元`,
    presetAll:"全部", presetView:"当前视图", presetsAria:"预设时间范围",
    errStart:(a,b)=>`起点须在 ${a} 与 ${b} 之间。`,
    errEnd:(a,b)=>`终点须在 ${a} 与 ${b} 之间。`,
    errSpan:n=>`时间范围至少要跨 ${n} 年。`,
    catsAria:"要显示的分类", catsAll:"全选", catsNone:"全不选", catsSync:"与时间线一致",
    periodsOn:"显示时间段（条形）",
    search:"搜索", searchAria:"搜索条目", showAll:"全部显示",
    tagPeriod:"时间段", tagFold:"在折叠区内", tagFoldTitle:"已被压缩隐藏",
    listEmpty:"此时间范围内没有符合所选分类的条目。", listNoMatch:"没有符合搜索的条目。",
    showAria:t=>`显示“${t}”`,
    noteItems:n=>`时间范围内共 ${n} 个条目`, noteHidden:n=>`${n} 个已隐藏`,
    noteFold:n=>`${n} 个在折叠区内`,
    noteDense:n=>`${n} 个没有卡片：此处过于密集。请隐藏一些、关闭图片，或压缩空白区。`,
    noteLost:n=>`${n} 个时间段放不下：请隐藏一些或缩小时间范围。`,
    cDots:n=>`${n} 个无卡片`, cDotsTitle:"此处过于密集：这些条目只显示为圆点，没有卡片。",
    cLost:n=>`${n} 个时间段放不下`, cImgFail:n=>`${n} 张图片不可用`,
    imgOn:"显示图片",
    imgNote:"图片来自各条目，按其地址加载：无网络或网站拒绝访问时，该卡片将不带图片导出。",
    imgStatus:(ok,n)=>`已加载 ${ok} / ${n} 张图片`, imgLoading:"正在加载图片…",
    imgNone:"当前设置下没有需要加载的图片。", imgRetry:"重新加载",
    compNote:"压缩会把一段空白时间换成固定宽度的折叠区。折叠区两端的日期仍然清晰可读；其中的条目会被隐藏。",
    compNone:"没有压缩：时间刻度是等比例的。",
    compAdd:"添加（建议）", compPlace:"在时间线上放置", compPlaceStop:"取消放置", compClear:"全部移除",
    compWidth:"折叠区宽度", widths:["窄","中","宽","很宽"],
    compN:i=>`折叠区 ${i}`, compDel:"删除", compDelAria:i=>`删除折叠区 ${i}`,
    compFrom:"自", compTo:"至", compYears:n=>`${n} 年`, compOut:"超出时间范围", compCrop:"已裁切",
    errInvalid:"日期无效。", errShort:"终点须比起点至少晚 2 年。",
    errRange:"该区域须位于所显示的时间范围内。", errOverlap:"该区域与另一个压缩重叠。",
    toastNoGap:"当前设置下没有可压缩的大段空白。",
    toastFoldPlaced:(a,b)=>`已放置折叠区：${a} → ${b}`, toastFoldAdded:(a,b)=>`已添加折叠区：${a} → ${b}`,
    toastFoldDeleted:"已删除折叠区。", toastFoldsCleared:"已移除所有压缩。",
    toastHidden:t=>`已隐藏“${t}”。`, undo:"撤销",
    docTitle:"标题", titlePh:"时间线", defaultTitle:"时间线", format:"格式",
    legend:"分类图例",
    fmt:{a4l:"A4 横向", a3l:"A3 横向", hd:"屏幕 16:9"},
    quality:"导出质量", qStd:"标准", qHi:"高清",
    expInfo:(w,h,dpi,f)=>`${w} × ${h} 像素${dpi?` · ${dpi} dpi`:''} · ${f}`,
    expPdf:"PDF", expPng:"PNG", expJpg:"JPG",
    expPdfNote:"PDF 只有一页，尺寸与所选格式一致：页面在其中是一张高清图片，因此文字无法选取。",
    generating:"正在生成…", resultTitle:"文件已就绪", btnSave:"保存", btnShare:"分享",
    toastDownloaded:n=>`已下载文件：${n}`, toastReady:"文件已就绪：请点按“保存”或“分享”。",
    errExport:m=>`无法导出：${m}。`, errBig:"图片对此设备来说太大，请改用“标准”质量",
    errUnexpected:"意外错误",
    imgFailed:n=>`${n} 张图片不可用：相应卡片将不带图片导出。`,
    reset:"重置", resetConfirm:"确认重置", toastReset:"已重置编辑模式设置。",
    sumHidden:n=>`${n} 个已隐藏`, sumAllVisible:"全部可见", sumOn:"已开启", sumOff:"已关闭",
    sumNone:"无", sumFolds:n=>`${n} 个折叠区`,
    sheetEvents:n=>`${n} 个事件`, sheetPeriods:n=>`${n} 个时间段`,
    sheetEmpty:"当前设置下没有可显示的内容。",
    sheetFoldNote:"折叠区压缩了时间：刻度并非等比例",
    sheetYears:n=>`${n} 年`, approx:"约",
    yFull:(n,bce)=>bce?`公元前${n}年`:(n<1000?`公元${n}年`:`${n}年`),
    eraTag:bce=>bce?'公元前':'公元', tickEra:(n,bce)=>`${bce?'公元前':'公元'}${n}`, mergeRange:false,
    unitK:"KB", unitM:"MB", dec:".", arrow:"→",
  },
};
let LANG = 'fr';
function t(key, ...args){
  const d = TS[LANG] || TS.fr;
  let v = d[key];
  if(v === undefined) v = TS.fr[key];
  return typeof v === 'function' ? v(...args) : v;
}
const LT = () => TS[LANG] || TS.fr;                     // table de la langue courante (pour les fonctions de mise en forme)

/* ============================================================================
   2. OUTILS : dates, échelle de temps (avec plis), formats d'export
============================================================================ */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Une date est stockée comme année + fraction (ex : 29,75) : l'année affichée est la partie entière, sans année zéro
function yearNum(y){ let r = Math.floor(y + 1e-9); if(r === 0) r = 1; return r; }
function fmtYear(y){ const r = yearNum(y); return LT().yFull(Math.abs(r), r < 0); }
function fmtShort(y){ return String(Math.abs(yearNum(y))); }
// « 2018 – 1843 av. n. è. » : l'ère n'est écrite qu'une fois quand les deux dates la partagent
function rangeText(a, b){
  const ya = yearNum(a), yb = yearNum(b), L = LT();
  if(L.mergeRange && (ya < 0) === (yb < 0)) return Math.abs(ya) + ' – ' + L.yFull(Math.abs(yb), yb < 0);
  return L.yFull(Math.abs(ya), ya < 0) + ' – ' + L.yFull(Math.abs(yb), yb < 0);
}
function niceStep(min){
  const S = [1,2,5,10,20,25,50,100,200,250,500,1000,2000,5000];
  for(const s of S) if(s >= min) return s;
  return 10000;
}

const FORMATS = {
  a4l:{w:297,  h:210,  mm:true},
  a3l:{w:420,  h:297,  mm:true},
  hd: {w:1920, h:1080, mm:false},
};
const fmtLabel = k => (LT().fmt || TS.fr.fmt)[k] || k;
const MAX_PIXELS = 16e6;           // au-delà, les navigateurs mobiles refusent de créer l'image
function exportSize(fk, hi){
  const f = FORMATS[fk]; let w, h;
  if(f.mm){ const dpi = hi ? 300 : 150; w = Math.round(f.w / 25.4 * dpi); h = Math.round(f.h / 25.4 * dpi); }
  else { const k = hi ? 2 : 1; w = f.w * k; h = f.h * k; }
  if(w * h > MAX_PIXELS){ const k = Math.sqrt(MAX_PIXELS / (w * h)); w = Math.floor(w * k); h = Math.floor(h * k); }
  return {w, h};
}
function pageSizePt(fk){ const f = FORMATS[fk]; return f.mm ? {w:f.w * 72 / 25.4, h:f.h * 72 / 25.4} : {w:f.w / 2, h:f.h / 2}; }

/* ---------- Échelle de temps : tronçons linéaires et « plis » de largeur fixe ---------- */
function buildScale(st, x0, x1){
  const a = st.start, b = st.end;
  const cs = st.comps.map(c => ({id:c.id, from:Math.max(a, c.from), to:Math.min(b, c.to)})).filter(c => c.to - c.from > 0).sort((p, q) => p.from - q.from);
  const L = x1 - x0, G = Math.min(st.gap, (L * 0.55) / Math.max(1, cs.length));
  const comp = cs.reduce((s, c) => s + (c.to - c.from), 0);
  const lin = Math.max(1e-6, (b - a) - comp);
  const px = Math.max(1e-4, (L - cs.length * G) / lin);
  const segs = []; let cur = a, x = x0;
  cs.forEach(c => {
    if(c.from > cur){ const w = (c.from - cur) * px; segs.push({k:'lin', t0:cur, t1:c.from, x0:x, x1:x + w}); x += w; }
    segs.push({k:'gap', t0:c.from, t1:c.to, x0:x, x1:x + G, id:c.id}); x += G; cur = c.to;
  });
  if(b > cur) segs.push({k:'lin', t0:cur, t1:b, x0:x, x1:x + (b - cur) * px});
  const last = segs.length ? segs[segs.length - 1].x1 : x1;
  const toX = tt => { if(tt <= a) return x0; if(tt >= b) return last; for(const s of segs){ if(tt <= s.t1) return s.x0 + (tt - s.t0) / (s.t1 - s.t0) * (s.x1 - s.x0); } return last; };
  const toT = xx => { for(const s of segs){ if(xx <= s.x1) return s.t0 + (xx - s.x0) / Math.max(1e-9, s.x1 - s.x0) * (s.t1 - s.t0); } return b; };
  const inGap = tt => segs.some(s => s.k === 'gap' && tt > s.t0 && tt < s.t1);
  const sameGap = (p, q) => segs.some(s => s.k === 'gap' && p >= s.t0 && q <= s.t1);      // période tout entière dans un pli
  return {segs, toX, toT, inGap, sameGap, px, G, x0, x1, count:cs.length};
}

/* ---------- Plis : validation et suggestion ---------- */
// Renvoie la clé du message d'erreur (voir TS), ou null si le pli est valable
function compError(st, id, from, to){
  if(!isFinite(from) || !isFinite(to)) return 'errInvalid';
  if(to - from < 2) return 'errShort';
  if(from < st.start || to > st.end) return 'errRange';
  if(st.comps.some(c => c.id !== id && from < c.to && to > c.from)) return 'errOverlap';
  return null;
}
// Le plus grand vide de la période (sans événement ni période, hors plis déjà posés), avec une marge
function suggestComp(st){
  const spans = [];
  items().forEach(x => {
    if(x.p && !st.periods) return;
    if(st.hidden.has(x.id) || !inCats(x, st.cats)) return;
    if(x.b < st.start || x.a > st.end) return;
    spans.push([Math.max(x.a, st.start), Math.min(x.b, st.end)]);
  });
  st.comps.forEach(c => { if(c.to > st.start && c.from < st.end) spans.push([Math.max(c.from, st.start), Math.min(c.to, st.end)]); });
  spans.sort((p, q) => p[0] - q[0]);
  let best = null, cur = st.start;
  const consider = (u, v) => { const d = v - u; if(d > 0 && (!best || d > best.d)) best = {d, a:u, b:v}; };
  spans.forEach(([a, b]) => { if(a > cur) consider(cur, a); cur = Math.max(cur, b); });
  consider(cur, st.end);
  if(!best || best.d < 30) return null;
  const step = niceStep(best.d / 25), m = Math.max(step, best.d * 0.07);
  const from = Math.ceil((best.a + m) / step) * step, to = Math.floor((best.b - m) / step) * step;
  return to - from >= 10 ? {from, to} : null;
}

/* ============================================================================
   3. DONNÉES : lecture (seule) des événements et des périodes de la frise
   ----------------------------------------------------------------------------
   Événements et périodes sont rangés dans une même liste :
   { id, t (titre), p (période ?), a (date, ou début), b (fin), approx, cats, cat, img, pos, year }
============================================================================ */
let api = null;                // objet transmis par app.js (voir init)
let DATA = null;               // liste mise en mémoire ; remise à zéro quand la frise change
let CATMAP = {};               // clé → { label, color }

function loadCats(){
  CATMAP = {};
  (api.categories() || []).forEach(c => {
    CATMAP[c.key] = {label:String(c.label || c.key), color:/^#[0-9a-f]{6}$/i.test(c.color || '') ? c.color : '#8A8F98', locked:!!c.locked};
  });
}
const catInfo = key => CATMAP[key] || {label:String(key), color:'#8A8F98'};
function readItems(){
  loadCats();
  const out = [], seen = new Set();
  (api.getItems() || []).forEach(it => {
    if(!it || it.id == null || seen.has(it.id)) return;
    const p = !!it.isPeriod;
    let a = Number(p ? it.start : it.y), b = p ? Number(it.end) : a;
    if(!isFinite(a) || !isFinite(b)) return;
    if(b < a){ const s = a; a = b; b = s; }
    seen.add(it.id);
    const cats = (api.itemCats(it) || []).filter(k => k != null);
    out.push({
      id:it.id, t:String(it.t == null ? '' : it.t), p, a, b, approx:!!it.approx,
      cats:cats.length ? cats : ['sans_categorie'], cat:cats.length ? cats[0] : 'sans_categorie',
      img:(typeof it.img === 'string' && it.img.trim()) ? it.img.trim() : null,
      pos:(typeof it.imgPosition === 'string' && it.imgPosition) ? it.imgPosition : null,
      year:(!p && it.year != null && isFinite(it.year)) ? Number(it.year) : null,
    });
  });
  out.sort((x, y) => x.a - y.a || x.b - y.b || x.t.localeCompare(y.t));
  return out;
}
function items(){ if(!DATA) DATA = readItems(); return DATA; }
const inCats = (x, set) => x.cats.some(k => set.has(k));
const colorOf = x => catInfo(x.cat).color;
const evYear = x => x.year != null ? x.year : x.a;                       // année affichée d'un événement
const evDate = x => (x.approx ? t('approx') : '') + fmtYear(evYear(x));   // « vers 2018 av. n. è. »
const itemDate = x => x.p ? (x.approx ? t('approx') : '') + rangeText(x.a, x.b) : evDate(x);

/* ============================================================================
   4. IMAGES
   ----------------------------------------------------------------------------
   Une image venue d'un autre site, dessinée telle quelle dans un canevas, le
   « salit » : le navigateur interdit alors d'en tirer un PNG, un JPG ou un PDF.
   Chaque image est donc chargée par fetch en mode CORS, transformée en copie
   locale réduite, puis dessinée. Si le site de l'image refuse ce chargement
   (ou s'il n'y a pas de connexion), la fiche est simplement dessinée sans image.
============================================================================ */
const IMG_MAX = 800;           // plus grand côté de la copie gardée en mémoire (suffisant, même en A3 haute définition)
const IMG_PARALLEL = 4;        // chargements simultanés : on ménage les sites d'images
const IMGS = new Map();        // adresse → { st:'load' | 'ok' | 'fail', el:canevas, p:promesse }
let imgQueue = [], imgActive = 0;
let imgListener = null;        // appelée à chaque image terminée (réussie ou non)

function netRun(job){
  return new Promise((res, rej) => {
    const go = () => {
      imgActive++;
      job().then(res, rej).then(() => { imgActive--; const nx = imgQueue.shift(); if(nx) nx(); });
    };
    imgActive < IMG_PARALLEL ? go() : imgQueue.push(go);
  });
}
async function fetchBlob(url){
  let err;
  for(let i = 0; i < 2; i++){
    try{
      // 2e essai en « reload » : contourne une copie en cache enregistrée sans les en-têtes CORS (image déjà affichée par une balise <img>)
      const res = await fetch(url, {mode:'cors', credentials:'omit', cache:i ? 'reload' : 'default'});
      if(res.ok) return await res.blob();
      err = new Error('HTTP ' + res.status); err.status = res.status;
      if(res.status === 429 || res.status >= 500){ await sleep(1200 + 800 * i); continue; }   // site surchargé : on patiente
      break;                                                                                  // 403, 404… : inutile d'insister
    }catch(e){ err = e; }                                                                     // réseau coupé ou CORS refusé
  }
  throw err || new Error('fetch');
}
function decodeImg(src){
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('image illisible'));
    im.src = src;
  });
}
function shrink(im){
  const sw = im.naturalWidth || im.width, sh = im.naturalHeight || im.height;
  if(!sw || !sh) throw new Error('image vide');
  const k = Math.min(1, IMG_MAX / Math.max(sw, sh)), c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sw * k)); c.height = Math.max(1, Math.round(sh * k));
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  return c;
}
async function loadImage(url){
  if(/^data:/i.test(url)) return shrink(await decodeImg(url));        // image enregistrée dans la fiche : aucun réseau
  const blob = await fetchBlob(url), obj = URL.createObjectURL(blob);
  try{ return shrink(await decodeImg(obj)); }
  finally{ URL.revokeObjectURL(obj); }
}
function imgGet(url){
  let r = IMGS.get(url);
  if(r) return r;
  r = {st:'load', el:null, p:null};
  IMGS.set(url, r);
  r.p = netRun(() => loadImage(url))
    .then(el => { r.el = el; r.st = 'ok'; })
    .catch(err => { r.st = 'fail'; r.err = err; })
    .then(() => { if(imgListener) imgListener(); });
  return r;
}
function imgRetryFailed(){ for(const [u, r] of IMGS) if(r.st === 'fail') IMGS.delete(u); }
function imgRelease(){ for(const [u, r] of IMGS) if(r.st !== 'load') IMGS.delete(u); }     // libère la mémoire à la fermeture

// « top center », « 50% 20% »… (l'object-position de la frise) → fractions de 0 à 1
function posFrac(pos){
  let fx = .5, fy = .5;
  if(!pos) return {fx, fy};
  const tk = String(pos).toLowerCase().trim().split(/\s+/).slice(0, 2);
  const kx = {left:0, center:.5, right:1}, ky = {top:0, center:.5, bottom:1};
  const num = s => /^-?\d+(\.\d+)?%$/.test(s) ? clamp(parseFloat(s) / 100, 0, 1) : null;
  const vx = s => kx[s] != null ? kx[s] : (num(s) != null ? num(s) : .5);
  const vy = s => ky[s] != null ? ky[s] : (num(s) != null ? num(s) : .5);
  if(tk.length === 1){
    const a = tk[0];
    if(a === 'top' || a === 'bottom') fy = vy(a); else fx = vx(a);
  } else if(tk.length === 2){
    const [a, b] = tk;
    if(a === 'top' || a === 'bottom' || b === 'left' || b === 'right'){ fy = vy(a); fx = vx(b); }
    else { fx = vx(a); fy = vy(b); }
  }
  return {fx, fy};
}

/* ============================================================================
   5. DESSIN DE LA PLANCHE
   ----------------------------------------------------------------------------
   Unités de conception : la largeur de la feuille vaut toujours 1000, la hauteur
   en découle (format). renderSheet() sert à l'aperçu comme à l'export.
============================================================================ */
const PAL = {bg:'#F1EFEB', band:'#B8B09F', ink:'#3B3830', mute:'#7E7B73', orange:'#D4561E', blue:'#2B4A7A', foldL:'#CDC8BA', foldD:'#7C725F'};
const FONT = '"Montserrat","Helvetica Neue",Arial,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif';
const TAU = Math.PI * 2;
function F(g, w, s){ g.font = w + ' ' + s + 'px ' + FONT; }
// réduit la taille de police (jusqu'à minSize) pour que le texte tienne dans maxW ; laisse la police réglée
function fitFont(g, text, weight, size, maxW, minSize){
  let s = size; F(g, weight, s);
  while(s > minSize && g.measureText(text).width > maxW){ s -= 0.5; F(g, weight, s); }
  return s;
}
function rr(g, x, y, w, h, r){
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
// rectangle dont les coins gauches et droits ont chacun leur rayon (0 = carré : barre qui se poursuit hors de la période)
function rrSides(g, x, y, w, h, rl, rrt){
  rl = Math.min(rl, w / 2, h / 2); rrt = Math.min(rrt, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + rl, y); g.lineTo(x + w - rrt, y);
  if(rrt) g.arcTo(x + w, y, x + w, y + rrt, rrt); else g.lineTo(x + w, y);
  g.lineTo(x + w, y + h - rrt);
  if(rrt) g.arcTo(x + w, y + h, x + w - rrt, y + h, rrt); else g.lineTo(x + w, y + h);
  g.lineTo(x + rl, y + h);
  if(rl) g.arcTo(x, y + h, x, y + h - rl, rl); else g.lineTo(x, y + h);
  g.lineTo(x, y + rl);
  if(rl) g.arcTo(x, y, x + rl, y, rl); else g.lineTo(x, y);
  g.closePath();
}
function poly(g, pts, fill){ g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fillStyle = fill; g.fill(); }
function drawFold(g, x, y, w, h){
  const n = 3, p = w / n, amp = h / 3;
  for(let i = 0; i < n; i++){
    const xs = x + i * p;
    poly(g, [[xs, y], [xs + p * .53, y - amp], [xs + p, y + h], [xs, y + h]], PAL.foldL);
    poly(g, [[xs + p * .53, y - amp], [xs + p, y], [xs + p, y + h]], PAL.foldD);
  }
}
function dot(g, x, y, r, c){ g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = c; g.fill(); g.lineWidth = 1.3; g.strokeStyle = PAL.bg; g.stroke(); }
function drawCover(g, src, x, y, w, h, r, pos){
  const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height; if(!sw || !sh) return;
  const k = Math.max(w / sw, h / sh), dw = sw * k, dh = sh * k, fp = posFrac(pos);
  g.save(); rr(g, x, y, w, h, r); g.clip(); g.drawImage(src, x - (dw - w) * fp.fx, y - (dh - h) * fp.fy, dw, dh); g.restore();
}
function textOn(hex){
  const n = parseInt(String(hex).slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.66 ? PAL.ink : '#FFFFFF';
}

/* ---------- Découpe du texte en lignes (les caractères chinois se coupent n'importe où, les mots non) ---------- */
const CJK_RE = /[⺀-鿿豈-﫿＀-￯]|[^⺀-鿿豈-﫿＀-￯]+/g;
function textUnits(text){
  const out = [];
  String(text).split(/\s+/).filter(Boolean).forEach((word, wi) => {
    (word.match(CJK_RE) || []).forEach((u, i) => out.push({s:u, sp:i === 0 && wi > 0}));
  });
  return out;
}
function wrapLines(g, text, maxW, maxLines){
  const us = textUnits(text), lines = []; let i = 0;
  while(i < us.length && lines.length < maxLines){
    let line = us[i++].s;
    while(i < us.length){
      const next = line + (us[i].sp ? ' ' : '') + us[i].s;
      if(g.measureText(next).width > maxW) break;
      line = next; i++;
    }
    lines.push(line);
  }
  if(!lines.length) return [''];
  const j = lines.length - 1; let l = lines[j];
  if(i < us.length || g.measureText(l).width > maxW){
    while(l.length > 1 && g.measureText(l + '…').width > maxW) l = l.slice(0, -1);
    lines[j] = l + '…';
  }
  return lines;
}
function ellipsize(g, text, maxW){
  if(maxW <= 4) return '';
  if(g.measureText(text).width <= maxW) return text;
  let l = text;
  while(l.length > 1 && g.measureText(l + '…').width > maxW) l = l.slice(0, -1);
  return l.length > 1 ? l + '…' : '';
}

/* ---------- Ce qui figure sur la planche : période, catégories, éléments masqués, plis ---------- */
function pickItems(st, sc){
  const o = {ev:[], per:[], inRange:0, hiddenManual:0, hiddenComp:0};
  for(const x of items()){
    if(x.p){ if(!st.periods || x.b < st.start || x.a > st.end) continue; }
    else if(x.a < st.start || x.a > st.end) continue;
    if(!inCats(x, st.cats)) continue;
    o.inRange++;
    if(st.hidden.has(x.id)){ o.hiddenManual++; continue; }
    if(x.p){
      if(sc.sameGap(Math.max(x.a, st.start), Math.min(x.b, st.end))){ o.hiddenComp++; continue; }
      o.per.push(x);
    } else {
      if(sc.inGap(x.a)){ o.hiddenComp++; continue; }
      o.ev.push(x);
    }
  }
  return o;
}

/* ---------- Barres des périodes : mesure des libellés, puis rangement en couloirs ---------- */
function layoutBars(g, per, sc, st, W, M){
  F(g, '700', 7.4);
  return per.map(x => {
    const xa = sc.toX(Math.max(x.a, st.start)), xb = sc.toX(Math.min(x.b, st.end));
    const w = Math.max(5, xb - xa), label = x.t || ' ', tw = g.measureText(label).width;
    let mode = 'in', l = xa, r = xa + w;
    if(tw + 7 > w){
      if(w >= 40) mode = 'trunc';                                            // assez large : libellé abrégé dans la barre
      else if(xa + w + 3 + tw <= W - M + 4){ mode = 'outR'; r = xa + w + 3 + tw; }   // barre courte : libellé à droite…
      else if(xa - 3 - tw >= M - 4){ mode = 'outL'; l = xa - 3 - tw; }               // …ou à gauche près du bord
      else mode = 'trunc';
    }
    return {x:xa, w, l, r, mode, label, item:x, clipL:x.a < st.start, clipR:x.b > st.end};
  });
}
function packBars(bars, maxLanes){
  const ends = [], placed = [], lost = [];
  bars.slice().sort((p, q) => p.l - q.l || q.r - p.r).forEach(bz => {
    let k = 0; while(k < ends.length && ends[k] > bz.l - 3) k++;
    if(k >= maxLanes){ lost.push(bz); return; }
    ends[k] = bz.r; bz.k = k; placed.push(bz);
  });
  return {placed, lost, lanes:ends.length};
}

/* ---------- La planche ---------- */
function renderSheet(ctx, Wpx, Hpx, st, opts){
  opts = opts || {};
  const L = LT();
  const s = Wpx / 1000, W = 1000, H = Hpx / s, M = 36;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, Wpx, Hpx); ctx.scale(s, s);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const x0 = M + 10, x1 = W - M - 10;
  const sc = buildScale(st, x0, x1), pk = pickItems(st, sc);

  /* Périodes : barres rangées en couloirs, en haut de la planche (au plus 30 % de la hauteur utile) */
  const top = 104, bottom = H - 62, bandH = 22, labH = 38, barH = 11, laneP = 14;
  const bars = layoutBars(ctx, pk.per, sc, st, W, M);
  const maxLanes = Math.max(1, Math.min(6, Math.floor(((bottom - top) - bandH - labH) * 0.3 / laneP)));
  const pack = packBars(bars, maxLanes);
  const nLanes = pack.placed.length ? pack.lanes : 0;
  const top2 = top + (nLanes ? nLanes * laneP + 6 : 0);          // début de la zone des fiches

  /* En-tête */
  const docTitle = (st.title || '').trim() || t('defaultTitle');
  ctx.fillStyle = PAL.blue; ctx.fillRect(M, 30, 54, 6);
  ctx.fillStyle = PAL.ink; fitFont(ctx, docTitle, '700', 25, W - 2 * M, 14); ctx.fillText(docTitle, M, 68);
  const sub = [fmtYear(st.start) + '  ' + L.arrow + '  ' + fmtYear(st.end), t('sheetEvents', pk.ev.length)];
  if(pack.placed.length) sub.push(t('sheetPeriods', pack.placed.length));
  ctx.fillStyle = PAL.mute; fitFont(ctx, sub.join('   ·   '), '500', 10.5, W - 2 * M, 8); ctx.fillText(sub.join('   ·   '), M, 86);

  /* Géométrie des fiches */
  const withImg = !!st.images, cw = 100, imgH = 40, dateH = 11, lh = 11.8, nl = 2, gapL = 7, tw = cw - 6;
  const txtH = dateH + nl * lh + 2, imgBlock = imgH + 3, baseA = 14;
  const avail = (bottom - top2) - bandH - labH, zoneA = avail / 2, zoneB = avail / 2;
  const bandTop = top2 + zoneA, bandBot = bandTop + bandH;
  const maxA = Math.max(0, Math.floor((zoneA - baseA + gapL) / (txtH + gapL))), maxB = Math.max(0, Math.floor((zoneB + gapL) / (txtH + gapL)));

  /* Bande + plis */
  ctx.fillStyle = PAL.band; ctx.fillRect(M, bandTop, W - 2 * M, bandH);
  sc.segs.forEach(sg => { if(sg.k === 'gap') drawFold(ctx, sg.x0, bandTop, sg.x1 - sg.x0, bandH); });

  /* Graduations */
  const step = niceStep(78 / sc.px), ticks = [];
  F(ctx, '600', 8.6);
  sc.segs.forEach(sg => { if(sg.k !== 'lin') return;
    for(let tt = Math.ceil(sg.t0 / step) * step; tt <= sg.t1 + 1e-9; tt += step){
      if(tt === 0) continue;
      const x = sc.toX(tt);
      if(x < x0 + 6 || x > x1 - 6) continue;
      if(sc.segs.some(h => h.k === 'gap' && (Math.abs(x - h.x1) < 10 || Math.abs(x - h.x0) < 10))) continue;
      const w = ctx.measureText(fmtShort(tt)).width + 4;
      const nextGap = sc.segs.find(h => h.k === 'gap' && h.x0 > x);
      if(x + w + 8 > (nextGap ? nextGap.x0 : W - M)) continue;
      ticks.push({t:tt, x});
    } });
  ctx.strokeStyle = PAL.bg; ctx.lineWidth = 1.1; ctx.fillStyle = PAL.ink; ctx.textAlign = 'left';
  ticks.forEach((tk, i) => {
    ctx.beginPath(); ctx.moveTo(tk.x, bandTop); ctx.lineTo(tk.x, bandBot); ctx.stroke();
    const prev = ticks[i - 1], era = !prev || (prev.t < 0 && tk.t > 0);
    ctx.fillText(era ? L.tickEra(Math.abs(yearNum(tk.t)), tk.t < 0) : fmtShort(tk.t), tk.x + 4, bandTop + bandH / 2 + 3);
  });

  /* Dates qui encadrent chaque pli */
  sc.segs.forEach(sg => { if(sg.k !== 'gap') return;
    const lx = Math.max(x0 + 12, sg.x0 - 17), rx = Math.min(x1 - 12, sg.x1 + 17);
    [[lx, sg.t0], [rx, sg.t1]].forEach(([xx, tt]) => {
      ctx.fillStyle = PAL.orange; ctx.beginPath(); ctx.arc(xx, bandBot + 9, 3.2, 0, TAU); ctx.fill();
      ctx.textAlign = 'center'; ctx.fillStyle = PAL.ink; F(ctx, '700', 10.5); ctx.fillText(fmtShort(tt), xx, bandBot + 25);
      ctx.fillStyle = PAL.mute; F(ctx, '500', 6.8); ctx.fillText(L.eraTag(tt < 0), xx, bandBot + 33.5);
    });
    ctx.fillStyle = PAL.mute; F(ctx, '500', 8); ctx.textAlign = 'center'; ctx.fillText(t('sheetYears', Math.round(sg.t1 - sg.t0)), (sg.x0 + sg.x1) / 2, bandBot + 17);
  });

  /* Placement des fiches : au-dessus ou au-dessous de la bande, en rangées (« couloirs ») sans chevauchement */
  F(ctx, '600', 9.6);
  const sides = [{last:[]}, {last:[]}], placed = [], dotOnly = []; let flip = 0, dflip = 0;
  /* Abscisses des dates qui encadrent les plis : on y évite le côté bas (tiges et fiches y croiseraient les libellés) */
  const flanks = []; sc.segs.forEach(g => { if(g.k === 'gap') flanks.push(Math.max(x0 + 12, g.x0 - 17), Math.min(x1 - 12, g.x1 + 17)); });
  pk.ev.forEach(e => {
    const x = sc.toX(e.a), right = x + cw <= W - M + 2, cl = right ? x : x - cw, cr = cl + cw;
    const nearFlank = flanks.some(fx => Math.abs(x - fx) < 20);
    const lane = [0, 1].map(si => { const mx = si ? maxB : maxA; let k = 0; while(k < mx && (sides[si].last[k] === undefined ? -1e9 : sides[si].last[k]) > cl - 4) k++; return k; });
    const cand = [0, 1].filter(si => lane[si] < (si ? maxB : maxA) && !(nearFlank && si === 1));
    if(!cand.length){ dotOnly.push({e, x, si:nearFlank ? 0 : dflip}); if(!nearFlank) dflip ^= 1; return; }
    let si; if(cand.length === 1) si = cand[0]; else if(lane[0] !== lane[1]) si = lane[0] < lane[1] ? 0 : 1; else { si = flip; flip ^= 1; }
    sides[si].last[lane[si]] = cr; placed.push({e, x, si, k:lane[si], right});
  });
  /* Hauteur de chaque fiche (avec ou sans image), puis de chaque couloir = celle de sa fiche la plus haute.
     Si les couloirs d'un côté dépassent la place disponible, le plus éloigné de la bande passe en simples points. */
  const failed = new Set();
  placed.forEach(p => {
    let im = null;
    if(withImg && p.e.img){ const r = imgGet(p.e.img); if(r.st === 'fail') failed.add(p.e.img); else im = r; }
    p.im = im; p.h = txtH + (im ? imgBlock : 0);
  });
  const offs = [[], []];
  [0, 1].forEach(si => {
    const room = si ? zoneB : zoneA - baseA;
    for(;;){
      const mine = placed.filter(p => p.si === si);
      if(!mine.length) break;
      const nK = Math.max(...mine.map(p => p.k)) + 1, LH = Array(nK).fill(0);
      mine.forEach(p => { LH[p.k] = Math.max(LH[p.k], p.h); });
      if(LH.reduce((a, b) => a + b, 0) + (nK - 1) * gapL <= room + 0.01){
        let acc = 0; for(let k = 0; k < nK; k++){ offs[si][k] = acc; acc += LH[k] + gapL; }
        break;
      }
      mine.filter(p => p.k === nK - 1).forEach(p => { placed.splice(placed.indexOf(p), 1); dotOnly.push({e:p.e, x:p.x, si:p.si}); });
    }
  });
  placed.forEach(p => {
    p.y = p.si === 0 ? bandTop - baseA - offs[0][p.k] - p.h : bandBot + labH + offs[1][p.k];
    p.dotY = p.si === 0 ? bandTop - 7 : bandBot + 7; p.far = p.si === 0 ? p.y : p.y + p.h;
  });

  /* Tiges, fiches, points */
  ctx.lineWidth = 1; ctx.globalAlpha = .8;
  placed.forEach(p => { ctx.strokeStyle = colorOf(p.e); ctx.beginPath(); ctx.moveTo(p.x, p.dotY); ctx.lineTo(p.x, p.far); ctx.stroke(); });
  ctx.globalAlpha = 1;
  const cards = []; ctx.textAlign = 'left';
  placed.forEach(p => {
    const col = colorOf(p.e), px0 = p.right ? p.x + 1.5 : p.x - cw - 1.5, ix = px0 + (p.right ? 3.5 : 2);
    ctx.fillStyle = PAL.bg; ctx.fillRect(px0, p.y - 1, cw, p.h + 2);
    let y = p.y;
    if(p.im){
      if(p.im.st === 'ok') drawCover(ctx, p.im.el, ix, y, tw, imgH, 3, p.e.pos);
      else { ctx.fillStyle = 'rgba(60,56,48,.09)'; rr(ctx, ix, y, tw, imgH, 3); ctx.fill(); }      // image en cours de chargement
      ctx.strokeStyle = 'rgba(60,56,48,.2)'; ctx.lineWidth = .6; rr(ctx, ix, y, tw, imgH, 3); ctx.stroke(); y += imgBlock;
    }
    const dt = evDate(p.e); ctx.fillStyle = col; fitFont(ctx, dt, '700', 8.2, tw, 6); ctx.fillText(dt, ix, y + 8.2);
    ctx.fillStyle = PAL.ink; F(ctx, '600', 9.6); wrapLines(ctx, p.e.t, tw, nl).forEach((ln, i) => ctx.fillText(ln, ix, y + dateH + 9.4 + i * lh));
    cards.push({id:p.e.id, x:px0, y:p.y, w:cw, h:p.h});
  });
  placed.forEach(p => dot(ctx, p.x, p.dotY, 4.4, colorOf(p.e)));
  dotOnly.forEach(d => {
    const y = d.si ? bandBot + 6 : bandTop - 6;
    ctx.strokeStyle = colorOf(d.e); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(d.x, d.si ? bandBot : bandTop); ctx.lineTo(d.x, y); ctx.stroke(); dot(ctx, d.x, y, 3, colorOf(d.e));
  });

  /* Barres des périodes */
  if(nLanes){
    pack.placed.forEach(bz => {
      const y = top + bz.k * laneP, col = colorOf(bz.item), ty = y + barH - 3.1;
      ctx.fillStyle = col; rrSides(ctx, bz.x, y, bz.w, barH, bz.clipL ? 0 : 2.6, bz.clipR ? 0 : 2.6); ctx.fill();
      F(ctx, '700', 7.4); ctx.textAlign = 'left';
      if(bz.mode === 'in'){ ctx.fillStyle = textOn(col); ctx.fillText(bz.label, bz.x + 3.5, ty); }
      else if(bz.mode === 'trunc'){ const lt = ellipsize(ctx, bz.label, bz.w - 7); if(lt){ ctx.fillStyle = textOn(col); ctx.fillText(lt, bz.x + 3.5, ty); } }
      else if(bz.mode === 'outR'){ ctx.fillStyle = PAL.ink; ctx.fillText(bz.label, bz.x + bz.w + 3, ty); }
      else { ctx.fillStyle = PAL.ink; ctx.textAlign = 'right'; ctx.fillText(bz.label, bz.x - 3, ty); ctx.textAlign = 'left'; }
      cards.push({id:bz.item.id, x:bz.l, y, w:bz.r - bz.l, h:barH, bar:true});
    });
    ctx.strokeStyle = 'rgba(60,56,48,.14)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(M, top2 - 3); ctx.lineTo(W - M, top2 - 3); ctx.stroke();
  }
  if(!pk.ev.length && !pack.placed.length){ ctx.fillStyle = PAL.mute; F(ctx, '500', 12); ctx.textAlign = 'center'; ctx.fillText(t('sheetEmpty'), W / 2, bandTop - 40); }

  /* Pied de page : légende des catégories à gauche, note sur les plis à droite */
  const fy = H - 26;
  ctx.strokeStyle = 'rgba(60,56,48,.16)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(M, H - 46); ctx.lineTo(W - M, H - 46); ctx.stroke();
  ctx.textAlign = 'left';
  let noteW = 0; const foldNote = t('sheetFoldNote');
  if(sc.count){ F(ctx, '500', 8.2); noteW = ctx.measureText(foldNote).width + 26 + 18; }
  if(st.legend){
    const used = new Set([...pk.ev.map(x => x.cat), ...pack.placed.map(b => b.item.cat)]);
    const keys = Object.keys(CATMAP).filter(k => used.has(k)).concat([...used].filter(k => !CATMAP[k]));
    const limit = W - M - noteW; let lx = M;
    for(let i = 0; i < keys.length; i++){
      const k = keys[i], lab = catInfo(k).label; F(ctx, '600', 9);
      const w = 10 + ctx.measureText(lab).width + 16;
      if(lx + w - 16 > limit){ ctx.fillStyle = PAL.mute; ctx.fillText('+' + (keys.length - i), lx, fy); break; }
      ctx.fillStyle = catInfo(k).color; ctx.beginPath(); ctx.arc(lx + 3.4, fy - 3, 3.4, 0, TAU); ctx.fill();
      ctx.fillStyle = PAL.ink; ctx.fillText(lab, lx + 10, fy); lx += w;
    }
  }
  if(sc.count){
    F(ctx, '500', 8.2); const w2 = ctx.measureText(foldNote).width;
    ctx.textAlign = 'right'; ctx.fillStyle = PAL.mute; ctx.fillText(foldNote, W - M, fy); drawFold(ctx, W - M - w2 - 26, fy - 8, 18, 9);
  }

  const imgUrls = [...new Set(placed.filter(p => p.im).map(p => p.e.img))];
  const info = {
    sc, W, H, cards, bandTop, bandBot, imgUrls, imgFailed:failed.size,
    imgOk:imgUrls.filter(u => IMGS.get(u) && IMGS.get(u).st === 'ok').length,
    counts:{inRange:pk.inRange, hiddenManual:pk.hiddenManual, hiddenComp:pk.hiddenComp, shown:pk.ev.length, placed:placed.length,
      dotOnly:dotOnly.length, perShown:pack.placed.length, perLost:pack.lost.length},
  };
  if(opts.overlay) opts.overlay(ctx, info);
  ctx.restore();
  return info;
}

/* ============================================================================
   6. EXPORT : PNG, JPG, PDF
   ----------------------------------------------------------------------------
   Le PDF est écrit à la main : une seule page, qui contient la planche sous
   forme d'image JPEG. Pas de bibliothèque à charger, donc rien à faire hors-ligne.
============================================================================ */
function buildPdf(jpg, iw, ih, pw, ph){
  const enc = new TextEncoder(), chunks = [], offs = []; let len = 0;
  const put = u => { chunks.push(u); len += u.length; }, txt = s => enc.encode(s);
  put(new Uint8Array([0x25,0x50,0x44,0x46,0x2D,0x31,0x2E,0x34,0x0A,0x25,0xE2,0xE3,0xCF,0xD3,0x0A]));
  const obj = (n, body) => { offs[n] = len; put(txt(n + ' 0 obj\n' + body + '\nendobj\n')); };
  const W = pw.toFixed(2), H = ph.toFixed(2);
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
  offs[4] = len; put(txt('4 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + iw + ' /Height ' + ih + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n'));
  put(jpg); put(txt('\nendstream\nendobj\n'));
  const cs = 'q ' + W + ' 0 0 ' + H + ' 0 0 cm /Im0 Do Q';
  obj(5, '<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream');
  obj(6, '<< /Title (Bibline) /Producer (Bibline) >>');
  const xr = len; let x = 'xref\n0 7\n0000000000 65535 f \n';
  for(let i = 1; i <= 6; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
  x += 'trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n' + xr + '\n%%EOF\n'; put(txt(x));
  const out = new Uint8Array(len); let o = 0; chunks.forEach(c => { out.set(c, o); o += c.length; });
  return out;
}
const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'bibline';
const canvasToBlob = (c, type, q) => new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error(t('errBig'))), type, q));
function fmtSize(b){
  const L = LT();
  const v = b >= 1048576 ? (b / 1048576).toFixed(1) + ' ' + L.unitM : Math.max(1, Math.round(b / 1024)) + ' ' + L.unitK;
  return v.replace('.', L.dec);
}
function anchorDownload(name, blob){
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.hidden = true; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 20000);
}
function canShareFile(file){
  try{ return !!(file && navigator.share && navigator.canShare && navigator.canShare({files:[file]})); }
  catch(err){ return false; }
}

/* ============================================================================
   7. RÉGLAGES : valeurs par défaut, enregistrement sur l'appareil
   ----------------------------------------------------------------------------
   Première ouverture : on part de ce que montre la frise (période affichée,
   catégories cochées, images). Ensuite, on retrouve la dernière composition.
============================================================================ */
let st = null;                                // réglages en cours
let saveTimer = 0;
let cidSeq = 10;
const newCid = () => 'c' + (++cidSeq);

function sanePeriod(a, b){
  a = clamp(Math.round(a), YMIN, YMAX - MIN_SPAN); b = clamp(Math.round(b), YMIN + MIN_SPAN, YMAX);
  if(b - a < MIN_SPAN){ b = Math.min(YMAX, a + MIN_SPAN); a = b - MIN_SPAN; }
  return [a, b];
}
function viewPeriod(){
  let v = null;
  try{ v = api.getView(); }catch(err){ v = null; }
  return (v && isFinite(v.start) && isFinite(v.end)) ? sanePeriod(v.start, v.end) : sanePeriod(-4500, 2036);
}
// Étendue de ce que contient la frise, arrondie au siècle
function dataPeriod(){
  const it = items();
  if(!it.length) return viewPeriod();
  let lo = Infinity, hi = -Infinity;
  it.forEach(x => { lo = Math.min(lo, x.a); hi = Math.max(hi, x.b); });
  return sanePeriod(Math.floor((lo - 10) / 100) * 100, Math.ceil((hi + 10) / 100) * 100);
}
function frisCats(){
  let a = [];
  try{ a = (api.getActiveCats() || []).filter(k => CATMAP[k]); }catch(err){ a = []; }
  return a.length ? new Set(a) : new Set(Object.keys(CATMAP));
}
function defaultState(){
  const per = viewPeriod();
  let img = true; try{ img = !!api.showImages(); }catch(err){ img = true; }
  return {title:'', start:per[0], end:per[1], cats:frisCats(), hidden:new Set(), images:img, legend:true, periods:true,
    format:'a4l', gap:56, comps:[], hi:false};
}
function saveNow(){
  clearTimeout(saveTimer); saveTimer = 0;
  if(!st) return;
  try{
    localStorage.setItem(STORE_KEY, JSON.stringify({
      v:1, title:st.title, start:st.start, end:st.end,
      catsOff:Object.keys(CATMAP).filter(k => !st.cats.has(k)),
      hidden:[...st.hidden], images:st.images, legend:st.legend, periods:st.periods,
      format:st.format, gap:st.gap, hi:st.hi,
      comps:st.comps.map(c => ({from:c.from, to:c.to})),
    }));
  }catch(err){ /* stockage indisponible (navigation privée…) : les réglages valent jusqu'à la fermeture */ }
}
function saveSoon(){ clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 400); }
function loadState(){
  const d = defaultState();
  let o = null;
  try{ o = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); }catch(err){ o = null; }
  if(!o || o.v !== 1 || typeof o !== 'object') return d;
  try{
    if(typeof o.title === 'string') d.title = o.title.slice(0, 60);
    if(isFinite(o.start) && isFinite(o.end)){ const p = sanePeriod(o.start, o.end); d.start = p[0]; d.end = p[1]; }
    if(Array.isArray(o.catsOff)){
      const off = new Set(o.catsOff), on = new Set(Object.keys(CATMAP).filter(k => !off.has(k)));
      if(on.size) d.cats = on;
    }
    if(Array.isArray(o.hidden)){
      const known = new Set(items().map(x => x.id));
      d.hidden = new Set(o.hidden.filter(id => known.has(id)));
    }
    if(typeof o.images === 'boolean') d.images = o.images;
    if(typeof o.legend === 'boolean') d.legend = o.legend;
    if(typeof o.periods === 'boolean') d.periods = o.periods;
    if(FORMATS[o.format]) d.format = o.format;
    if(isFinite(o.gap)) d.gap = clamp(Math.round(o.gap), 36, 110);
    if(typeof o.hi === 'boolean') d.hi = o.hi;
    if(Array.isArray(o.comps)){
      const wide = Object.assign({}, d, {start:-1e5, end:1e5, comps:[]});
      o.comps.slice(0, 12).forEach(c => {
        if(!c || !isFinite(c.from) || !isFinite(c.to)) return;
        const id = newCid();
        if(!compError(wide, id, Number(c.from), Number(c.to))) wide.comps.push({id, from:Number(c.from), to:Number(c.to)});
      });
      d.comps = wide.comps;
    }
  }catch(err){ console.warn('Bibline — édition : réglages enregistrés illisibles, valeurs par défaut utilisées.', err); return defaultState(); }
  return d;
}

/* ============================================================================
   8. FENÊTRE : aperçu, interactions sur la planche, panneau de réglages
   ----------------------------------------------------------------------------
   Le balisage est dans index.html (#edition-overlay). Les textes fixes y portent
   data-t / data-tp / data-tt / data-ta (texte, champ de saisie, infobulle,
   étiquette d'accessibilité) et sont remplis par applyStatic() ; le reste
   (puces, listes, champs de date) est construit ici.
============================================================================ */
const $ = id => document.getElementById(id);
const h = (tag, cls, html) => { const n = document.createElement(tag); if(cls) n.className = cls; if(html != null) n.innerHTML = html; return n; };
const COARSE = (() => { try{ return matchMedia('(pointer:coarse)').matches; }catch(err){ return false; } })();
const REDUCED = (() => { try{ return matchMedia('(prefers-reduced-motion:reduce)').matches; }catch(err){ return false; } })();
const ysh = y => (y < 0 ? '−' : '') + (Math.abs(yearNum(y)));
const FOLD_SVG = '<path style="fill:var(--ed-foldl)" d="M0 6L6.4 2L12 18L0 18ZM12 6L18.4 2L24 18L12 18ZM24 6L30.4 2L36 18L24 18Z"/><path style="fill:var(--ed-foldd)" d="M6.4 2L12 6L12 18ZM18.4 2L24 6L24 18ZM30.4 2L36 6L36 18Z"/>';

let D = null, inited = false, OPEN = false;
const ui = {zoom:false, placing:null, hover:null, focusComp:null, busy:false, q:'', uid:0, last:null, size:'', force:false, raf:0,
  w:0, wide:false, short:false, out:null, tt:0, rt:0, armed:false, fStart:null, fEnd:null, presets:[]};

function grab(){
  const d = {}, map = {overlay:'edition-overlay', card:'edition-card', close:'ed-close'};
  const ids = ['body','stage','zfit','zbig','goexport','placecancel','wrap','sheet','counts','hint','panel',
    'v-per','perfields','pererr','presets','v-cat','catchips','catall','catnone','catsync','v-ev','swper','evsearch','evall','evnote','evlist',
    'v-img','swimg','imgstatus','imgretry','v-comp','complist','compadd','compplace','compclear','gapw','gapout',
    'v-lay','doctitle','fmt','swleg','v-exp','qual','expinfo','result','result-name','result-note','result-save','result-share',
    'reset','toast','toastmsg','toastundo','s-exp'];
  ids.forEach(k => { map[k.replace(/-(\w)/g, (m, c) => c.toUpperCase())] = 'ed-' + k; });
  for(const k in map){ const el = $(map[k]); if(!el) return false; d[k] = el; }
  D = d;
  return true;
}

/* ---------- Message fugitif (avec « Annuler » facultatif) ---------- */
function hideToast(){ D.toast.hidden = true; }
function toast(msg, undo){
  D.toastmsg.textContent = msg; D.toastundo.hidden = !undo;
  D.toastundo.onclick = () => { hideToast(); if(undo) undo(); };
  D.toast.hidden = false; clearTimeout(ui.tt); ui.tt = setTimeout(hideToast, undo ? 6500 : 4200);
}

/* ---------- Polices : un canevas ne les charge pas de lui-même ---------- */
let fontsP = null;
function ensureFonts(){
  if(!(document.fonts && document.fonts.load)) return Promise.resolve();
  if(!fontsP){
    const sample = 'Éé…·→';
    fontsP = Promise.race([Promise.all(['500', '600', '700'].map(w => document.fonts.load(w + ' 16px Montserrat', sample))), sleep(3500)]).catch(() => {});
  }
  return fontsP;
}

/* ---------- Aperçu ---------- */
function schedule(force){
  if(!OPEN) return;
  if(force !== false) ui.force = true;
  if(ui.raf) return;
  ui.raf = requestAnimationFrame(() => { ui.raf = 0; const f = ui.force; ui.force = false; draw(f); });
}
function draw(force){
  if(!OPEN || !st) return;
  const cv = D.sheet, wrap = D.wrap, f = FORMATS[st.format], asp = f.w / f.h;
  const bw = Math.max(120, wrap.clientWidth), bh = Math.max(90, wrap.clientHeight);
  wrap.classList.toggle('zoom', ui.zoom);
  const cssW = ui.zoom ? Math.max(bw, 1500) : Math.floor(Math.min(bw, bh * asp)), cssH = Math.round(cssW / asp);
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5), pw = Math.min(Math.round(cssW * dpr), 2600), ph = Math.round(pw / asp);
  const key = pw + 'x' + ph + (ui.zoom ? 'z' : 'f');
  if(!force && key === ui.size) return;
  ui.size = key; cv.width = pw; cv.height = ph; cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
  try{ ui.last = renderSheet(cv.getContext('2d'), pw, ph, st, {overlay}); }
  catch(err){ console.error('Bibline — édition :', err); D.hint.textContent = String(err && err.message || err); return; }
  updateCounts();
}
function updateCounts(){
  const c = ui.last.counts, p = ['<b>' + esc(t('sheetEvents', c.shown)) + '</b>'];
  if(c.perShown) p.push(esc(t('sheetPeriods', c.perShown)));
  if(c.dotOnly) p.push('<span class="ed-w" title="' + esc(t('cDotsTitle')) + '">' + esc(t('cDots', c.dotOnly)) + '</span>');
  if(c.perLost) p.push('<span class="ed-w">' + esc(t('cLost', c.perLost)) + '</span>');
  if(c.hiddenManual) p.push(esc(t('sumHidden', c.hiddenManual)));
  if(c.hiddenComp) p.push(esc(t('noteFold', c.hiddenComp)));
  if(ui.last.imgFailed) p.push('<span class="ed-w">' + esc(t('cImgFail', ui.last.imgFailed)) + '</span>');
  D.counts.innerHTML = p.join(' · ');
  renderItemsNote(); refreshImgStatus();
}
function refreshImgStatus(){
  if(!OPEN || !ui.last) return;
  const L = ui.last, n = L.imgUrls.length + L.imgFailed;
  const loading = L.imgUrls.filter(u => { const r = IMGS.get(u); return r && r.st === 'load'; }).length;
  let msg = '';
  if(st.images){
    if(!n) msg = t('imgNone');
    else if(loading) msg = t('imgLoading') + ' (' + (n - loading - L.imgFailed) + ' / ' + n + ')';
    else msg = t('imgStatus', n - L.imgFailed, n);
  }
  D.imgstatus.textContent = msg; D.imgstatus.hidden = !msg;
  D.imgretry.hidden = !(st.images && L.imgFailed > 0);
}

/* ---------- Surcouche de l'aperçu (jamais exportée) : pli en cours d'édition, survol, pose d'un pli ---------- */
const clampX = (x, sc) => Math.min(sc.x1, Math.max(sc.x0, x));
function snapT(tt, sc){ const rs = niceStep(7 / sc.px); let v = Math.round(tt / rs) * rs; if(v === 0) v = 1; return Math.min(st.end, Math.max(st.start, v)); }
function overlay(g, info){
  const sc = info.sc, y0 = 104, y1 = info.H - 50;
  if(ui.focusComp){
    const s = sc.segs.find(q => q.k === 'gap' && q.id === ui.focusComp);
    if(s){ g.save(); g.fillStyle = 'rgba(212,86,30,.13)'; g.fillRect(s.x0, y0, s.x1 - s.x0, y1 - y0); g.strokeStyle = 'rgba(212,86,30,.75)'; g.lineWidth = 1.2; g.setLineDash([4, 3]); g.strokeRect(s.x0, y0, s.x1 - s.x0, y1 - y0); g.restore(); }
  }
  if(ui.hover && !ui.placing){
    const c = info.cards.find(q => q.id === ui.hover);
    if(c){
      g.save(); g.strokeStyle = PAL.orange; g.lineWidth = 1.4; g.setLineDash([3, 2]); rr(g, c.x - 2, c.y - 3, c.w + 4, c.h + 6, 4); g.stroke(); g.setLineDash([]);
      g.fillStyle = PAL.orange; g.beginPath(); g.arc(c.x + c.w + 2, c.y - 3, 6.5, 0, TAU); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(c.x + c.w - .5, c.y - 5.5); g.lineTo(c.x + c.w + 4.5, c.y - .5); g.moveTo(c.x + c.w + 4.5, c.y - 5.5); g.lineTo(c.x + c.w - .5, c.y - .5); g.stroke(); g.restore();
    }
  }
  const P = ui.placing; if(!P) return;
  const xa = P.a !== null ? sc.toX(P.a) : null; let xh = null, th = null;
  if(P.hx !== null){ th = snapT(sc.toT(clampX(P.hx, sc)), sc); xh = sc.toX(th); }
  g.save();
  if(xa !== null && xh !== null){ g.fillStyle = 'rgba(212,86,30,.13)'; g.fillRect(Math.min(xa, xh), y0, Math.abs(xh - xa), y1 - y0); }
  g.lineWidth = 1.4; g.setLineDash([5, 3]); g.strokeStyle = PAL.orange;
  const marks = [[xa, P.a], [xh, th]].filter(m => m[0] !== null);
  marks.forEach(([x]) => { g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); });
  g.setLineDash([]); F(g, '700', 8); g.textAlign = 'left';
  marks.forEach(([x, tt]) => {
    const txt = ysh(tt), w = g.measureText(txt).width + 12, lx = Math.min(Math.max(x - w / 2, 4), 996 - w);
    g.fillStyle = PAL.orange; rr(g, lx, y0 - 16, w, 13, 6.5); g.fill(); g.fillStyle = '#fff'; g.fillText(txt, lx + 6, y0 - 6.6);
  });
  g.restore();
}

/* ---------- Interactions sur la planche : masquer une fiche ou une barre, poser un pli ---------- */
function toDu(ev){ const r = D.sheet.getBoundingClientRect(); return {x:(ev.clientX - r.left) / r.width * 1000, y:(ev.clientY - r.top) / r.height * ui.last.H}; }
function hitCard(p){ const cs = ui.last.cards; for(let i = cs.length - 1; i >= 0; i--){ const c = cs[i]; if(p.x >= c.x - 1 && p.x <= c.x + c.w + 1 && p.y >= c.y - 3 && p.y <= c.y + c.h + 3) return c; } return null; }
function hint(){
  const el = D.hint, P = ui.placing, v = COARSE ? t('tapCoarse') : t('tapFine');
  el.classList.toggle('act', !!P);
  el.textContent = !P ? t('hintHide', v) : P.a === null ? t('hintA', v) : t('hintB', v, fmtYear(P.a));
}
function paintPlace(){
  const on = !!ui.placing;
  D.compplace.setAttribute('aria-pressed', String(on)); D.compplace.textContent = on ? t('compPlaceStop') : t('compPlace');
  D.sheet.style.cursor = on ? 'crosshair' : ''; D.goexport.hidden = on; D.placecancel.hidden = !on;
}
function setPlacing(on){
  ui.placing = on ? {a:null, hx:null} : null;
  if(!D) return;
  paintPlace(); hint(); schedule();
}
function placeTap(p){
  const sc = ui.last.sc, P = ui.placing, tt = snapT(sc.toT(clampX(p.x, sc)), sc);
  if(P.a === null){ P.a = tt; hint(); schedule(); return; }
  const a = Math.min(P.a, tt), b = Math.max(P.a, tt), err = compError(st, null, a, b);
  if(err){ toast(t(err)); P.a = null; hint(); schedule(); return; }
  const c = {id:newCid(), from:a, to:b}; st.comps.push(c); setPlacing(false);
  renderComps(); afterComp();
  toast(t('toastFoldPlaced', fmtYear(a), fmtYear(b)), () => { st.comps = st.comps.filter(x => x !== c); renderComps(); afterComp(); });
}
function hideItem(id){
  const x = items().find(q => q.id === id); if(!x) return;
  st.hidden.add(id); ui.hover = null; renderItems(); sum(); schedule(); saveSoon();
  toast(t('toastHidden', x.t || '—'), () => { st.hidden.delete(id); renderItems(); sum(); schedule(); saveSoon(); });
}
function wireSheet(){
  const cv = D.sheet;
  cv.addEventListener('click', ev => {
    if(!ui.last) return;
    const p = toDu(ev);
    if(ui.placing){ placeTap(p); return; }
    const c = hitCard(p); if(c) hideItem(c.id);
  });
  cv.addEventListener('pointermove', ev => {
    if(ev.pointerType !== 'mouse' || !ui.last) return;
    const p = toDu(ev);
    if(ui.placing){ ui.placing.hx = p.x; schedule(); return; }
    const c = hitCard(p), id = c ? c.id : null;
    if(id !== ui.hover){ ui.hover = id; cv.style.cursor = id ? 'pointer' : ''; schedule(); }
  });
  cv.addEventListener('pointerleave', () => {
    if(ui.placing) ui.placing.hx = null;
    if(ui.hover || ui.placing){ ui.hover = null; schedule(); }
  });
}

/* ---------- Résumés affichés à droite de chaque section ---------- */
function sum(){
  D.vPer.textContent = ysh(st.start) + ' → ' + ysh(st.end);
  D.vCat.textContent = st.cats.size + ' / ' + Object.keys(CATMAP).length;
  D.vEv.textContent = st.hidden.size ? t('sumHidden', st.hidden.size) : t('sumAllVisible');
  D.vImg.textContent = st.images ? t('sumOn') : t('sumOff');
  D.vComp.textContent = st.comps.length ? t('sumFolds', st.comps.length) : t('sumNone');
  D.vLay.textContent = fmtLabel(st.format);
  D.vExp.textContent = 'PDF · PNG · JPG';
}

/* ---------- Champ de date : année (clavier numérique) + bascule d'ère ---------- */
function showErr(n, msg){ n.textContent = msg || ''; n.hidden = !msg; }
// apply(année) applique la valeur et renvoie un message d'erreur (texte) ou null
function dateField(labelKey, get, apply, errNode){
  const id = 'eddf' + (++ui.uid), root = h('div', 'ed-df'), label = t(labelKey);
  root.innerHTML = '<label class="ed-df-l" for="' + id + '">' + esc(label) + '</label>'
    + '<input id="' + id + '" class="ed-df-n" type="text" inputmode="numeric" autocomplete="off" maxlength="4" aria-label="' + esc(t('yearAria', label)) + '">'
    + '<div class="ed-seg ed-df-e" role="group" aria-label="' + esc(t('eraAria', label)) + '"><button type="button" data-s="-1">' + esc(t('bceBtn')) + '</button><button type="button" data-s="1">' + esc(t('ceBtn')) + '</button></div>';
  const inp = root.querySelector('input'), bs = [...root.querySelectorAll('button')]; let sign = -1, pend = null, et = 0;
  const paint = () => bs.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.s === sign)));
  const set = (y, keep) => {
    const r = yearNum(y); sign = r < 0 ? -1 : 1; inp.value = String(Math.abs(r)); paint(); root.classList.remove('bad');
    if(!keep){ clearTimeout(et); pend = null; if(errNode) showErr(errNode, ''); }
  };
  // Une valeur valable s'applique tout de suite ; une valeur refusée n'est signalée qu'après une courte pause
  // (en tapant « 2026 », les chiffres intermédiaires « 2 », « 20 »… ne doivent pas clignoter en rouge)
  const flush = () => { clearTimeout(et); if(pend){ root.classList.add('bad'); if(errNode) showErr(errNode, pend); pend = null; } };
  const commit = () => {
    clearTimeout(et); pend = null;
    const n = parseInt(inp.value.replace(/\D/g, ''), 10); if(!(n > 0)) return;
    const err = apply(sign * n);
    if(!err){ root.classList.remove('bad'); if(errNode) showErr(errNode, ''); return; }
    pend = err; et = setTimeout(flush, 800);
  };
  inp.addEventListener('input', commit);
  inp.addEventListener('blur', () => { flush(); set(get(), true); });      // le message reste affiché : le retirer ferait bouger la page sous le doigt
  bs.forEach(b => b.addEventListener('click', () => { sign = +b.dataset.s; paint(); commit(); flush(); }));
  set(get());
  return {root, set};
}

/* ---------- Période ---------- */
function afterPeriod(){ markPresets(); renderCats(); renderItems(); renderComps(); sum(); schedule(); saveSoon(); }
function buildPeriodFields(){
  ui.fStart = dateField('from', () => st.start, y => {
    if(y < YMIN || y > YMAX - MIN_SPAN) return t('errStart', fmtYear(YMIN), fmtYear(YMAX - MIN_SPAN));
    if(st.end - y < MIN_SPAN) return t('errSpan', MIN_SPAN);
    st.start = y; afterPeriod(); return null;
  }, D.pererr);
  ui.fEnd = dateField('to', () => st.end, y => {
    if(y < YMIN + MIN_SPAN || y > YMAX) return t('errEnd', fmtYear(YMIN + MIN_SPAN), fmtYear(YMAX));
    if(y - st.start < MIN_SPAN) return t('errSpan', MIN_SPAN);
    st.end = y; afterPeriod(); return null;
  }, D.pererr);
  D.perfields.textContent = ''; D.perfields.append(ui.fStart.root, ui.fEnd.root);
}
function presetList(){
  const all = dataPeriod(), view = viewPeriod(), list = [[t('presetAll'), all[0], all[1]]];
  let eras = []; try{ eras = api.eras() || []; }catch(err){ eras = []; }
  eras.forEach(e => { if(e && isFinite(e.start) && isFinite(e.end)){ const p = sanePeriod(e.start, e.end); list.push([String(e.title), p[0], p[1]]); } });
  list.push([t('presetView'), view[0], view[1]]);
  return list;
}
function buildPresets() {
  ui.presets = presetList(); D.presets.textContent = '';
  ui.presets.forEach(([lab, a, b]) => {
    const bt = h('button', 'ed-chip ed-pre'); bt.type = 'button'; bt.textContent = lab;
    bt.addEventListener('click', () => { st.start = a; st.end = b; ui.fStart.set(a); ui.fEnd.set(b); showErr(D.pererr, ''); afterPeriod(); });
    D.presets.appendChild(bt);
  });
  markPresets();
}
function markPresets(){ [...D.presets.children].forEach((bt, i) => { const p = ui.presets[i]; bt.setAttribute('aria-pressed', String(!!p && st.start === p[1] && st.end === p[2])); }); }

/* ---------- Catégories ---------- */
function inPeriod(x){ return x.p ? (st.periods && x.b >= st.start && x.a <= st.end) : (x.a >= st.start && x.a <= st.end); }
function buildCats(){
  D.catchips.textContent = '';
  Object.keys(CATMAP).forEach(k => {
    const c = CATMAP[k], b = h('button', 'ed-chip', '<span class="ed-chip-dot"></span><span class="ed-chip-t"></span><span class="ed-chip-n"></span>');
    b.type = 'button'; b.dataset.cat = k; b.style.setProperty('--c', c.color); b.querySelector('.ed-chip-t').textContent = c.label;
    b.addEventListener('click', () => { if(st.cats.has(k)) st.cats.delete(k); else st.cats.add(k); afterCats(); });
    D.catchips.appendChild(b);
  });
}
function renderCats(){
  const n = {};
  items().forEach(x => { if(inPeriod(x)) x.cats.forEach(k => { n[k] = (n[k] || 0) + 1; }); });
  [...D.catchips.children].forEach(b => { const k = b.dataset.cat; b.setAttribute('aria-pressed', String(st.cats.has(k))); b.querySelector('.ed-chip-n').textContent = n[k] || 0; });
}
function afterCats(){ renderCats(); renderItems(); sum(); schedule(); saveSoon(); }

/* ---------- Éléments (événements et périodes) ---------- */
function renderItemsNote(){
  const sc = buildScale(st, 46, 954); let n = 0, hid = 0, gap = 0;
  items().forEach(x => {
    if(!inPeriod(x) || !inCats(x, st.cats)) return;
    n++;
    if(st.hidden.has(x.id)) hid++;
    else if(x.p ? sc.sameGap(Math.max(x.a, st.start), Math.min(x.b, st.end)) : sc.inGap(x.a)) gap++;
  });
  const p = [t('noteItems', n)]; if(hid) p.push(t('noteHidden', hid)); if(gap) p.push(t('noteFold', gap));
  let msg = p.join(' · ') + '.';
  const c = ui.last && ui.last.counts;
  if(c && c.dotOnly) msg += ' ' + t('noteDense', c.dotOnly);
  if(c && c.perLost) msg += ' ' + t('noteLost', c.perLost);
  D.evnote.textContent = msg;
}
function renderItems(){
  const box = D.evlist, q = norm(ui.q.trim()), sc = buildScale(st, 46, 954);
  const rows = items().filter(x => inPeriod(x) && inCats(x, st.cats) && (!q || norm(x.t + ' ' + itemDate(x)).includes(q)));
  box.textContent = '';
  const frag = document.createDocumentFragment();
  rows.forEach(x => {
    const hid = st.hidden.has(x.id), gap = x.p ? sc.sameGap(Math.max(x.a, st.start), Math.min(x.b, st.end)) : sc.inGap(x.a);
    const li = h('li', 'ed-ev' + (hid ? ' off' : '')); li.dataset.id = x.id;
    li.innerHTML = '<label class="ed-ev-main"><input type="checkbox"' + (hid ? '' : ' checked') + ' aria-label="' + esc(t('showAria', x.t)) + '"><span class="ed-ev-dot" style="background:' + esc(colorOf(x)) + '"></span>'
      + '<span class="ed-ev-txt"><span class="ed-ev-date">' + esc(itemDate(x)) + '</span><span class="ed-ev-title">' + esc(x.t) + '</span></span></label>'
      + (x.p ? '<span class="ed-tag ed-tag-p">' + esc(t('tagPeriod')) + '</span>' : '')
      + (gap ? '<span class="ed-tag" title="' + esc(t('tagFoldTitle')) + '">' + esc(t('tagFold')) + '</span>' : '');
    frag.appendChild(li);
  });
  box.appendChild(frag);
  if(!rows.length) box.appendChild(h('li', 'ed-ev-empty', esc(q ? t('listNoMatch') : t('listEmpty'))));
  renderItemsNote();
}

/* ---------- Compressions (plis) ---------- */
function afterComp(){ renderItems(); sum(); schedule(); saveSoon(); }
function renderComps(){
  const box = D.complist; box.textContent = '';
  if(!st.comps.length){ box.appendChild(h('p', 'ed-note', esc(t('compNone')))); return; }
  const wide = () => Object.assign({}, st, {start:-1e5, end:1e5});
  [...st.comps].sort((a, b) => a.from - b.from).forEach((c, i) => {
    const card = h('div', 'ed-comp'), err = h('p', 'ed-err'); err.hidden = true; err.setAttribute('role', 'alert');
    const head = h('div', 'ed-comp-h', '<svg class="ed-fold" viewBox="0 0 36 18" aria-hidden="true">' + FOLD_SVG + '</svg><div class="ed-comp-ti"><span class="ed-comp-t">' + esc(t('compN', i + 1)) + '</span><span class="ed-comp-d"></span></div>');
    const del = h('button', 'ed-btn ed-sm ed-ghost'); del.type = 'button'; del.textContent = t('compDel'); del.setAttribute('aria-label', t('compDelAria', i + 1)); head.appendChild(del);
    const info = head.querySelector('.ed-comp-d');
    const upd = () => { info.textContent = t('compYears', Math.round(c.to - c.from)) + (c.to <= st.start || c.from >= st.end ? ' · ' + t('compOut') : (c.from < st.start || c.to > st.end ? ' · ' + t('compCrop') : '')); };
    const f1 = dateField('compFrom', () => c.from, y => { const e = compError(wide(), c.id, y, c.to); if(!e){ c.from = y; upd(); afterComp(); } return e ? t(e) : null; }, err);
    const f2 = dateField('compTo', () => c.to, y => { const e = compError(wide(), c.id, c.from, y); if(!e){ c.to = y; upd(); afterComp(); } return e ? t(e) : null; }, err);
    const dates = h('div', 'ed-dates'); dates.append(f1.root, f2.root); card.append(head, dates, err); upd();
    del.addEventListener('click', () => {
      const snap = st.comps.slice(); st.comps = st.comps.filter(x => x !== c); renderComps(); afterComp();
      toast(t('toastFoldDeleted'), () => { st.comps = snap; renderComps(); afterComp(); });
    });
    const on = () => { ui.focusComp = c.id; schedule(); }, off = () => { if(ui.focusComp === c.id){ ui.focusComp = null; schedule(); } };
    card.addEventListener('focusin', on); card.addEventListener('focusout', off);
    card.addEventListener('pointerenter', e => { if(e.pointerType === 'mouse') on(); });
    card.addEventListener('pointerleave', e => { if(e.pointerType === 'mouse' && !card.contains(document.activeElement)) off(); });
    box.appendChild(card);
  });
}
function gapOut(){ const g = st.gap; D.gapout.textContent = t('widths')[g < 48 ? 0 : g < 76 ? 1 : g < 96 ? 2 : 3]; }

/* ---------- Mise en page, qualité ---------- */
function buildFormats(){
  D.fmt.textContent = '';
  Object.keys(FORMATS).forEach(k => { const o = h('option'); o.value = k; o.textContent = fmtLabel(k); D.fmt.appendChild(o); });
  D.fmt.value = st.format;
}
function paintQual(){ [...D.qual.children].forEach(b => b.setAttribute('aria-pressed', String((b.dataset.q === 'hi') === st.hi))); }
function expInfo(){
  const z = exportSize(st.format, st.hi), f = FORMATS[st.format];
  D.expinfo.textContent = t('expInfo', z.w, z.h, f.mm ? Math.round(z.w / (f.w / 25.4)) : 0, fmtLabel(st.format));
}
function paintZoom(){ D.zfit.setAttribute('aria-pressed', String(!ui.zoom)); D.zbig.setAttribute('aria-pressed', String(ui.zoom)); }
function setZoom(z){
  ui.zoom = z; if(!z){ D.wrap.scrollLeft = 0; D.wrap.scrollTop = 0; }
  paintZoom(); sizeWrap(); schedule();
}

/* ---------- Résultat d'un export ---------- */
function showResult(extra){
  const o = ui.out;
  if(!o){ D.result.hidden = true; return; }
  D.result.hidden = false; D.resultName.textContent = o.name + ' · ' + fmtSize(o.blob.size);
  D.resultNote.textContent = extra || ''; D.resultNote.hidden = !extra;
  D.resultShare.hidden = !o.share;
}
function setBusy(kind){
  D.panel.querySelectorAll('[data-x]').forEach(b => { b.disabled = !!kind; b.textContent = (kind && b.dataset.x === kind) ? t('generating') : b.dataset.x.toUpperCase(); });
}
const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 20)));
async function exportAs(kind){
  if(ui.busy || !st) return;
  ui.busy = true; setBusy(kind);
  try{
    await ensureFonts(); await nextFrame();
    const f = FORMATS[st.format], asp = f.w / f.h;
    imgRetryFailed();                                    // une image qui a échoué tout à l'heure (site surchargé…) a droit à un nouvel essai
    /* 1. Dessins d'essai, à petite taille : ils disent quelles fiches portent une image, que l'on charge avant le vrai dessin
          (jusqu'à 4 passes : quand une image échoue, la fiche rétrécit et peut laisser la place à une autre) */
    const probe = document.createElement('canvas'); probe.width = 1000; probe.height = Math.round(1000 / asp);
    for(let i = 0; i < 4; i++){
      const pinfo = renderSheet(probe.getContext('2d'), probe.width, probe.height, st);
      const wait = pinfo.imgUrls.map(u => IMGS.get(u)).filter(r => r && r.st === 'load');
      if(!wait.length) break;
      await Promise.all(wait.map(r => r.p));
    }
    probe.width = probe.height = 0;
    /* 2. Dessin définitif à la taille d'export (si, par extraordinaire, une image est encore en route, on l'attend et on redessine) */
    const z = exportSize(st.format, st.hi), cvs = document.createElement('canvas'); cvs.width = z.w; cvs.height = z.h;
    let info = null;
    for(let i = 0; ; i++){
      info = renderSheet(cvs.getContext('2d'), z.w, z.h, st);
      const wait = info.imgUrls.map(u => IMGS.get(u)).filter(r => r && r.st === 'load');
      if(!wait.length || i >= 3) break;
      await Promise.all(wait.map(r => r.p));
    }
    let blob;
    if(kind === 'png') blob = await canvasToBlob(cvs, 'image/png');
    else if(kind === 'jpg') blob = await canvasToBlob(cvs, 'image/jpeg', .93);
    else {
      const jb = await canvasToBlob(cvs, 'image/jpeg', .92), pt = pageSizePt(st.format);
      blob = new Blob([buildPdf(new Uint8Array(await jb.arrayBuffer()), z.w, z.h, pt.w, pt.h)], {type:'application/pdf'});
    }
    cvs.width = cvs.height = 0;
    if(!OPEN) return;                                   // la fenêtre a été fermée pendant la génération
    await deliver(slug((st.title || '').trim() || t('defaultTitle')) + '.' + kind, blob, info.imgFailed);
  }catch(err){
    console.error('Bibline — édition :', err);
    if(OPEN) toast(t('errExport', err && err.message ? err.message : t('errUnexpected')));
  }finally{ ui.busy = false; if(D) setBusy(null); }
}
// Ordinateur : téléchargement direct. Téléphone ou tablette : feuille de partage du système (« Enregistrer dans Fichiers »…),
// ou, si elle est refusée (le geste du doigt est trop ancien), boutons « Enregistrer » / « Partager » dans le panneau.
async function deliver(name, blob, failed){
  const file = (typeof File === 'function') ? new File([blob], name, {type:blob.type}) : null;
  ui.out = {name, blob, file, share:canShareFile(file)};
  showResult(failed ? t('imgFailed', failed) : '');
  if(!COARSE){ anchorDownload(name, blob); toast(t('toastDownloaded', name)); return; }
  if(ui.out.share){
    try{ await navigator.share({files:[file], title:name}); return; }
    catch(err){ if(err && err.name === 'AbortError') return; }
  }
  toast(t('toastReady'));
}

/* ---------- Sections repliables (une seule ouverte à la fois sur écran étroit) ---------- */
function scrollSec(d){
  requestAnimationFrame(() => {
    const p = D.panel, top = d.getBoundingClientRect().top - p.getBoundingClientRect().top + p.scrollTop - 2;
    if(p.scrollTo) p.scrollTo({top:Math.max(0, top), behavior:REDUCED ? 'auto' : 'smooth'}); else p.scrollTop = Math.max(0, top);
  });
}
function openSec(d){ if(!d.open) d.open = true; scrollSec(d); }

/* ---------- Disposition selon la taille de la fenêtre ---------- */
function sizeWrap(){
  if(!D) return;
  if(ui.wide){ D.wrap.style.height = ''; return; }
  const f = FORMATS[st ? st.format : 'a4l'], asp = f.w / f.h, sw = D.stage.clientWidth || 320;
  const max = Math.max(150, Math.round(D.overlay.clientHeight * (ui.zoom ? 0.5 : 0.4)));
  D.wrap.style.height = Math.round(clamp(sw / asp, 120, max)) + 'px';
}
function computeLayout(){
  if(!D) return;
  const w = D.overlay.clientWidth, hh = D.overlay.clientHeight;
  const short = hh <= 480 && w > hh;                           // téléphone en paysage
  const wide = w >= 900 || (short && w >= 560);                // deux colonnes : réglages à gauche, aperçu à droite
  D.overlay.classList.toggle('ed-short', short); D.overlay.classList.toggle('ed-wide', wide);
  const changed = wide !== ui.wide;
  ui.short = short; ui.wide = wide;
  if(changed) layoutSecs();
  sizeWrap();
}
// Deux colonnes : toutes les sections sont ouvertes. Une colonne : une seule à la fois (accordéon), pour que l'aperçu reste en vue.
function layoutSecs(first){
  const secs = [...D.overlay.querySelectorAll('.ed-sec')];
  if(ui.wide){ secs.forEach(d => { d.open = true; }); return; }
  const keep = first || secs.find(d => d.open) || secs[0];
  secs.forEach(d => { d.open = d === keep; });
}
function onResize(){ if(!OPEN) return; computeLayout(); schedule(false); }

/* ---------- Construction et synchronisation ---------- */
function applyStatic(){
  if(!D) return;
  const root = D.overlay;
  root.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  root.querySelectorAll('[data-tp]').forEach(el => { el.placeholder = t(el.dataset.tp); });
  root.querySelectorAll('[data-tt]').forEach(el => { el.title = t(el.dataset.tt); });
  root.querySelectorAll('[data-ta]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.ta)); });
  const rb = $('rail-edition');
  if(rb){
    rb.title = t('railTitle'); rb.setAttribute('aria-label', t('railTitle'));
    const lb = rb.querySelector('.rail-label'); if(lb) lb.textContent = t('rail');
  }
}
function buildStatic(){          // éléments qui dépendent de la langue ou des données
  buildPeriodFields(); buildPresets(); buildCats(); buildFormats();
}
function syncAll(){
  ui.fStart.set(st.start); ui.fEnd.set(st.end); showErr(D.pererr, '');
  D.doctitle.value = st.title; D.fmt.value = st.format; D.swimg.checked = st.images; D.swleg.checked = st.legend; D.swper.checked = st.periods;
  D.gapw.value = st.gap; gapOut(); D.evsearch.value = ui.q;
  paintQual(); paintZoom(); paintPlace(); disarmReset(); renderCats(); renderItems(); renderComps(); markPresets(); expInfo(); sum(); hint();
  showResult(ui.out ? (D.resultNote.textContent || '') : '');
  sizeWrap(); schedule();
}
function refreshAll(){ renderCats(); renderItems(); renderComps(); markPresets(); sum(); schedule(); }
function disarmReset(){ const b = D.reset; clearTimeout(ui.rt); delete b.dataset.armed; b.textContent = t('reset'); b.classList.remove('ed-danger'); }
function resetAll(){
  st = defaultState(); ui.q = ''; ui.zoom = false; ui.hover = null; ui.focusComp = null; ui.out = null;
  setPlacing(false); buildCats(); buildFormats(); syncAll(); saveSoon(); toast(t('toastReset'));
}
function markSeen(){
  const dot = document.querySelector('#rail-edition .new-dot');
  if(dot) dot.remove();
  try{ localStorage.setItem(SEEN_KEY, '1'); }catch(err){ /* stockage indisponible : la pastille reviendra, sans conséquence */ }
}

/* ---------- Câblage des contrôles ---------- */
function wireUI(){
  D.close.addEventListener('click', closeWin);
  D.overlay.addEventListener('click', e => { if(e.target === D.overlay) closeWin(); });
  document.addEventListener('keydown', e => {
    if(e.key !== 'Escape' || !OPEN) return;
    if(ui.placing){ setPlacing(false); return; }
    closeWin();
  });
  wireSheet();
  D.zfit.onclick = () => setZoom(false); D.zbig.onclick = () => setZoom(true);
  D.goexport.onclick = () => openSec(D.sExp);
  D.placecancel.onclick = () => setPlacing(false);
  D.catall.onclick = () => { Object.keys(CATMAP).forEach(k => st.cats.add(k)); afterCats(); };
  D.catnone.onclick = () => { st.cats.clear(); afterCats(); };
  D.catsync.onclick = () => { st.cats = frisCats(); afterCats(); };
  D.swper.addEventListener('change', e => { st.periods = e.target.checked; renderCats(); renderItems(); sum(); schedule(); saveSoon(); });
  D.evsearch.addEventListener('input', e => { ui.q = e.target.value; renderItems(); });
  D.evall.onclick = () => { st.hidden.clear(); renderItems(); sum(); schedule(); saveSoon(); };
  D.evlist.addEventListener('change', ev => {
    const el = ev.target, li = el.closest && el.closest('li'); if(!li || el.type !== 'checkbox') return;
    if(el.checked) st.hidden.delete(li.dataset.id); else st.hidden.add(li.dataset.id);
    li.classList.toggle('off', !el.checked); sum(); renderItemsNote(); schedule(); saveSoon();
  });
  D.swimg.addEventListener('change', e => { st.images = e.target.checked; sum(); schedule(); refreshImgStatus(); saveSoon(); });
  D.imgretry.onclick = () => { imgRetryFailed(); schedule(); };
  D.compadd.onclick = () => {
    const g = suggestComp(st); if(!g){ toast(t('toastNoGap')); return; }
    const c = {id:newCid(), from:g.from, to:g.to}; st.comps.push(c); renderComps(); afterComp();
    toast(t('toastFoldAdded', fmtYear(g.from), fmtYear(g.to)), () => { st.comps = st.comps.filter(x => x !== c); renderComps(); afterComp(); });
  };
  D.compplace.onclick = () => setPlacing(!ui.placing);
  D.compclear.onclick = () => {
    if(!st.comps.length) return;
    const snap = st.comps.slice(); st.comps = []; renderComps(); afterComp();
    toast(t('toastFoldsCleared'), () => { st.comps = snap; renderComps(); afterComp(); });
  };
  D.gapw.addEventListener('input', e => { st.gap = +e.target.value; gapOut(); schedule(); saveSoon(); });
  D.doctitle.addEventListener('input', e => { st.title = e.target.value; schedule(); saveSoon(); });
  D.fmt.addEventListener('change', e => { st.format = e.target.value; sum(); expInfo(); sizeWrap(); schedule(); saveSoon(); });
  D.swleg.addEventListener('change', e => { st.legend = e.target.checked; schedule(); saveSoon(); });
  D.qual.addEventListener('click', e => { const b = e.target.closest('button'); if(!b) return; st.hi = b.dataset.q === 'hi'; paintQual(); expInfo(); saveSoon(); });
  D.panel.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', () => exportAs(b.dataset.x)));
  D.resultSave.onclick = () => { if(ui.out){ anchorDownload(ui.out.name, ui.out.blob); toast(t('toastDownloaded', ui.out.name)); } };
  D.resultShare.onclick = async () => {
    if(!ui.out || !ui.out.file) return;
    try{ await navigator.share({files:[ui.out.file], title:ui.out.name}); }
    catch(err){ if(!(err && err.name === 'AbortError')) toast(t('errExport', err && err.message ? err.message : t('errUnexpected'))); }
  };
  D.reset.onclick = () => {
    const b = D.reset;
    if(!b.dataset.armed){ b.dataset.armed = '1'; b.textContent = t('resetConfirm'); b.classList.add('ed-danger'); ui.rt = setTimeout(disarmReset, 3500); return; }
    disarmReset(); resetAll();
  };
  D.overlay.querySelectorAll('.ed-sec').forEach(d => d.addEventListener('toggle', () => {
    if(!ui.armed || !d.open || ui.wide) return;                    // à deux colonnes, chaque section s'ouvre et se ferme librement
    D.overlay.querySelectorAll('.ed-sec').forEach(o => { if(o !== d && o.open) o.open = false; });
    scrollSec(d);
  }));
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(onResize, 80));
  if(window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
  if(window.ResizeObserver){
    new ResizeObserver(() => {
      if(!OPEN) return;
      const k = Math.round(D.wrap.clientWidth) * 10000 + Math.round(D.wrap.clientHeight);
      if(k !== ui.w){ ui.w = k; schedule(false); }
    }).observe(D.wrap);
  }
  if(document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => schedule());
  document.addEventListener('visibilitychange', () => { if(document.hidden && OPEN) saveNow(); });
}

/* ============================================================================
   9. POINT D'ENTRÉE (appelé par app.js)
   ----------------------------------------------------------------------------
   app.js appelle init() avec un objet « api » (voir la section « Mode édition »
   de app.js), puis seulement ces méthodes. Chacune est protégée : une erreur ici
   est consignée dans la console et n'interrompt jamais la frise.
============================================================================ */
function openWin(){
  if(!inited) return;
  OPEN = true; DATA = null; loadCats();
  st = loadState();
  ui.q = ''; ui.zoom = false; ui.hover = null; ui.focusComp = null; ui.armed = false; ui.size = ''; ui.last = null;
  imgListener = () => { schedule(true); };
  D.overlay.classList.add('open');
  hideToast(); setPlacing(false); disarmReset();
  computeLayout();
  buildStatic(); syncAll();
  layoutSecs($('ed-s-per'));
  D.panel.scrollTop = 0;
  setTimeout(() => { ui.armed = true; }, 400);
  ensureFonts().then(() => schedule());
  markSeen();
  try{ D.close.focus({preventScroll:true}); }catch(err){ /* sans importance */ }
}
function closeWin(){
  if(!inited || !OPEN) return;
  OPEN = false; saveNow();
  imgListener = null; imgRelease(); ui.out = null; ui.last = null;
  clearTimeout(ui.tt); clearTimeout(ui.rt);
  D.overlay.classList.remove('open'); D.result.hidden = true;
  const rb = $('rail-edition'); if(rb) try{ rb.focus({preventScroll:true}); }catch(err){ /* sans importance */ }
}
function init(a){
  if(inited) return true;
  api = a;
  if(!grab()){
    console.warn("Bibline — édition : la fenêtre est absente de la page, le mode édition est désactivé.");
    D = null;
    return false;
  }
  try{ const l = api.lang && api.lang(); if(l && TS[l]) LANG = l; }catch(err){ /* français par défaut */ }
  wireUI();
  inited = true;
  applyStatic();
  try{
    if(localStorage.getItem(SEEN_KEY)){ const dot = document.querySelector('#rail-edition .new-dot'); if(dot) dot.remove(); }
  }catch(err){ /* stockage indisponible : la pastille « nouveau » reste affichée */ }
  return true;
}
function langChanged(lang){
  if(lang && TS[lang]) LANG = lang;
  if(!inited) return;
  applyStatic();
  if(OPEN){ ui.size = ''; buildStatic(); syncAll(); }
}
// Appelé à chaque modification des éléments de la frise (ajout, modification, suppression, import…)
function itemsChanged(){
  DATA = null;
  if(!inited || !OPEN) return;
  loadCats(); buildCats(); refreshAll();
}
function safe(fn, fallback){
  return function(){
    try{ return fn.apply(null, arguments); }
    catch(err){ console.error('Bibline — édition :', err); return fallback; }
  };
}
window.BiblineEdition = {
  init: safe(init, false),
  open: safe(openWin),
  close: safe(closeWin),
  isOpen: () => OPEN,
  langChanged: safe(langChanged),
  itemsChanged: safe(itemsChanged),
};

})();
