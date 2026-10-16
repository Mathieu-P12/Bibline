/* ============================================================================
   Bibline — Arbre généalogique (arbre.js)
   ----------------------------------------------------------------------------
   Ce fichier ajoute à Bibline la fenêtre « Arbre généalogique ». Il ne connaît
   de l'application que ce que lui transmet app.js par la méthode init()
   (section « Arbre généalogique » de app.js) : il ne touche jamais directement
   à la frise, au stockage ni aux paramètres.

   Deux bases, reliées par l'identifiant de l'élément :
   • la base des événements (celle de la frise) : un personnage est un élément
     de catégorie « Personnage » — nom, dates, photo, description, références ;
   • la base généalogique (propre à ce fichier) : une fiche par personnage
     { sexe, note, refs } et la liste des familles { partenaires, enfants,
     jumeaux }. Elle est enregistrée à côté des événements (table « meta »).

   Le placement des médaillons et le tracé des liens sont calculés ici, à partir
   de ces deux bases seulement : rien n'est dessiné à la main.
============================================================================ */
(function(){
'use strict';

const PERSON_CAT = 'personnage';
const SEED_VERSION = 2;          // version du contenu généalogique livré (1 : personnages et familles ; 2 : + catégories)
const SEED_TOLERANCE = 200;      // écart de dates (en années) toléré pour rapprocher un personnage déjà saisi

/* ============================================================================
   1. TEXTES (français, anglais, espagnol, chinois)
============================================================================ */
const W = (s,m,f,n) => s==='M' ? m : s==='F' ? f : n;     // choix selon le sexe : homme, femme, non renseigné
const TS = {
  fr:{
    title:"Arbre généalogique", railTitle:"Arbre généalogique",
    searchPh:"Rechercher un personnage…", noResult:"Aucun résultat",
    overview:"Vue d'ensemble", wide:"Famille élargie", wideHint:"(grands-parents, petits-enfants)",
    addPerson:"Ajouter un personnage", close:"Fermer",
    zoomIn:"Zoom avant", zoomOut:"Zoom arrière", zoomFit:"Tout afficher",
    legendBtn:"Signification des symboles", legendTitle:"Symboles",
    lgMale:"Homme", lgFemale:"Femme", lgUnknown:"Non renseigné",
    lgUnion:"Union (● départ des enfants)", lgKin:"Union entre parents",
    emptyTitle:"Aucun personnage pour l'instant",
    emptyText:(c)=>`Les éléments de la catégorie « ${c} » apparaissent ici. Ajoutez-en un pour commencer l'arbre.`,
    goTimeline:"Aller voir sur la frise", editItem:"Modifier la fiche",
    noteTitle:"Note généalogique", modify:"Modifier", fill:"Renseigner",
    noNote:"Aucune note. « Modifier » permet de justifier les liens avec des références bibliques.",
    noFiche:"Ce personnage n'a pas encore de fiche généalogique (sexe inconnu, aucun lien). « Renseigner » ou les boutons « Ajouter » ci-dessous permettent de le relier.",
    family:"Famille", noLinks:"Aucun lien renseigné.", addLabel:"Ajouter",
    father:"Père", mother:"Mère", parents:"Parents", siblings:"Frères et sœurs", halfSiblings:"Demi-frères et sœurs",
    wife:"Épouse", husband:"Époux", spouse:"Conjoint", children:"Enfants",
    addParent:"+ Parent", addChild:"+ Enfant",
    unknownM:"inconnu", unknownF:"inconnue", twin:"jumeau",
    byFather:"par le père", byMother:"par la mère", byParent:"par un parent",
    son:"fils", daughter:"fille", childN:"enfant",
    kinTitle:"Union consanguine", kinCommon:"ancêtre commun",
    kinHalf:"demi-frère et demi-sœur", kinSib:"frère et sœur",
    kinUncle:(u,su,nv)=>`${u} est ${W(su,'l’oncle','la tante','l’oncle ou la tante')} de ${nv}`,
    kinCousins:"cousins germains",
    kinUncleBreton:(u,su,nv)=>`${u} est ${W(su,'oncle','tante','oncle ou tante')} « à la mode de Bretagne » de ${nv}`,
    kinSecond:"cousins issus de germains", kinFar:"parents éloignés",
    ficheTitle:"Fiche généalogique", sexLabel:"Sexe", male:"Homme", female:"Femme", unknownSex:"Non renseigné",
    noteLabel:"Note", refsLabel:"Références bibliques", refsPh:"ex : Gn 20:12 ; Ex 6:20",
    cancel:"Annuler", save:"Enregistrer", ficheSaved:"Fiche généalogique enregistrée.",
    addTitle:"Ajouter un personnage",
    addChildOf:(n)=>`Ajouter un enfant de ${n}`,
    addSpouseTo:(n,s)=>`Ajouter ${W(s,'une épouse','un époux','un conjoint')} à ${n}`,
    addParentOf:(n)=>`Ajouter un parent de ${n}`,
    formNote:(c)=>`Le nom, les dates, la photo et la description vont dans la frise (catégorie « ${c} ») : le personnage y apparaîtra aussi. Le sexe, la note, les références et les liens familiaux sont conservés dans la base généalogique.`,
    fName:"Nom", fBirth:"Date de naissance", fDeath:"Date de décès", optional:"(facultatif)",
    bce:"av. n. è.", ce:"de n. è.", fApprox:"Date approximative (« vers… »)", fYearPh:"Année",
    fPhoto:"Photo", fPhotoPh:"Lien de l'image (https://…)", fOr:"ou",
    fPhotoPrev:"Aperçu : la photo sera découpée dans le symbole (carré ou rond).",
    fDesc:"Description", fDescHint:"(affichée sur la frise)",
    fSection:"Fiche généalogique", fNote:"Note généalogique", fNotePh:"ex : fille de Lévi, épouse de son neveu Amram",
    fRels:"Liens familiaux", fFather:"Père", fMother:"Mère", fSpouse:"Conjoint", fChildOf:"Parent de", none:"—",
    doAdd:"Ajouter",
    errName:"Le nom est obligatoire.",
    errBirth:"La date de naissance est obligatoire : sans elle, le personnage ne peut pas être placé sur la frise.",
    errBirthFmt:"Date de naissance invalide : saisissez une année en chiffres (ex : 1850).",
    errDeath:"Date de décès invalide.", errDeathOrder:"Le décès doit être postérieur à la naissance.",
    errTwoParents:(n)=>`${n} a déjà deux parents renseignés.`,
    errParentSex:(n,p)=>`${n} a déjà un parent de ce sexe (${p}).`,
    errCycle:(n)=>`${n} serait à la fois ancêtre et descendant : vérifiez les liens familiaux.`,
    errSame:"Une même personne ne peut pas occuper deux liens différents.",
    added:(n,c)=>`${n} ajouté à l'arbre et à la frise (catégorie ${c}).`,
    seeded:(a,m,c)=>{
      const p = [];
      if(a) p.push(`${a} personnage${a>1?'s':''} ajouté${a>1?'s':''} à la catégorie « ${c} »`);
      if(m) p.push(`${m} déjà présent${m>1?'s':''}, rattaché${m>1?'s':''} à l'arbre`);
      return `Arbre généalogique : ${p.join(' ; ')}.`;
    },
    seededCats:(cats,n)=>{
      const c = cats.length ? `${cats.length>1?'nouvelles catégories':'nouvelle catégorie'} (${cats.join(', ')})` : '';
      const p = n ? `${n} personnage${n>1?'s':''} classé${n>1?'s':''}` : '';
      return `Arbre généalogique : ${[c,p].filter(Boolean).join(' ; ')}.`;
    },
    filterBtn:"Filtre", filterTitle:"Mettre en avant une catégorie", filterReset:"Tout afficher",
    filterHint:"Les autres personnages restent visibles, mais en retrait.",
    filterNone:"Aucune autre catégorie n'est attribuée aux personnages pour l'instant.",
    filterClear:"Retirer le filtre",
  },
  en:{
    title:"Family tree", railTitle:"Family tree",
    searchPh:"Search a person…", noResult:"No result",
    overview:"Overview", wide:"Extended family", wideHint:"(grandparents, grandchildren)",
    addPerson:"Add a person", close:"Close",
    zoomIn:"Zoom in", zoomOut:"Zoom out", zoomFit:"Show everything",
    legendBtn:"What the symbols mean", legendTitle:"Symbols",
    lgMale:"Man", lgFemale:"Woman", lgUnknown:"Not specified",
    lgUnion:"Union (● where children start)", lgKin:"Union between relatives",
    emptyTitle:"Nobody here yet",
    emptyText:(c)=>`Items of the “${c}” category appear here. Add one to start the tree.`,
    goTimeline:"Show on the timeline", editItem:"Edit entry",
    noteTitle:"Genealogical note", modify:"Edit", fill:"Fill in",
    noNote:"No note. “Edit” lets you back the family links with Bible references.",
    noFiche:"This person has no genealogical record yet (sex unknown, no links). “Fill in” or the “Add” buttons below let you connect them.",
    family:"Family", noLinks:"No link recorded.", addLabel:"Add",
    father:"Father", mother:"Mother", parents:"Parents", siblings:"Brothers and sisters", halfSiblings:"Half-siblings",
    wife:"Wife", husband:"Husband", spouse:"Spouse", children:"Children",
    addParent:"+ Parent", addChild:"+ Child",
    unknownM:"unknown", unknownF:"unknown", twin:"twin",
    byFather:"via father", byMother:"via mother", byParent:"via a parent",
    son:"son", daughter:"daughter", childN:"child",
    kinTitle:"Union between relatives", kinCommon:"common ancestor",
    kinHalf:"half-brother and half-sister", kinSib:"brother and sister",
    kinUncle:(u,su,nv)=>`${u} is ${nv}’s ${W(su,'uncle','aunt','uncle or aunt')}`,
    kinCousins:"first cousins",
    kinUncleBreton:(u,su,nv)=>`${u} is ${nv}’s first cousin once removed`,
    kinSecond:"second cousins", kinFar:"distant relatives",
    ficheTitle:"Genealogical record", sexLabel:"Sex", male:"Man", female:"Woman", unknownSex:"Not specified",
    noteLabel:"Note", refsLabel:"Bible references", refsPh:"e.g. Gen 20:12 ; Ex 6:20",
    cancel:"Cancel", save:"Save", ficheSaved:"Genealogical record saved.",
    addTitle:"Add a person",
    addChildOf:(n)=>`Add a child of ${n}`,
    addSpouseTo:(n,s)=>`Add ${W(s,'a wife','a husband','a spouse')} to ${n}`,
    addParentOf:(n)=>`Add a parent of ${n}`,
    formNote:(c)=>`The name, dates, photo and description go to the timeline (category “${c}”): the person will appear there too. Sex, note, references and family links are kept in the genealogy data.`,
    fName:"Name", fBirth:"Date of birth", fDeath:"Date of death", optional:"(optional)",
    bce:"BCE", ce:"CE", fApprox:"Approximate date (“circa…”)", fYearPh:"Year",
    fPhoto:"Photo", fPhotoPh:"Image link (https://…)", fOr:"or",
    fPhotoPrev:"Preview: the photo will be cropped to the symbol (square or round).",
    fDesc:"Description", fDescHint:"(shown on the timeline)",
    fSection:"Genealogical record", fNote:"Genealogical note", fNotePh:"e.g. daughter of Levi, wife of her nephew Amram",
    fRels:"Family links", fFather:"Father", fMother:"Mother", fSpouse:"Spouse", fChildOf:"Parent of", none:"—",
    doAdd:"Add",
    errName:"The name is required.",
    errBirth:"The date of birth is required: without it, the person cannot be placed on the timeline.",
    errBirthFmt:"Invalid date of birth: enter a year in digits (e.g. 1850).",
    errDeath:"Invalid date of death.", errDeathOrder:"The death must come after the birth.",
    errTwoParents:(n)=>`${n} already has two parents recorded.`,
    errParentSex:(n,p)=>`${n} already has a parent of this sex (${p}).`,
    errCycle:(n)=>`${n} would be both an ancestor and a descendant: check the family links.`,
    errSame:"The same person cannot fill two different links.",
    added:(n,c)=>`${n} added to the tree and the timeline (category ${c}).`,
    seeded:(a,m,c)=>{
      const p = [];
      if(a) p.push(`${a} ${a>1?'people':'person'} added to the “${c}” category`);
      if(m) p.push(`${m} already present, linked to the tree`);
      return `Family tree: ${p.join('; ')}.`;
    },
    seededCats:(cats,n)=>{
      const c = cats.length ? `new ${cats.length>1?'categories':'category'} (${cats.join(', ')})` : '';
      const p = n ? `${n} ${n>1?'people':'person'} categorised` : '';
      return `Family tree: ${[c,p].filter(Boolean).join('; ')}.`;
    },
    filterBtn:"Filter", filterTitle:"Highlight a category", filterReset:"Show all",
    filterHint:"Everyone else stays visible, but faded.",
    filterNone:"No other category is assigned to the people yet.",
    filterClear:"Clear the filter",
  },
  es:{
    title:"Árbol genealógico", railTitle:"Árbol genealógico",
    searchPh:"Buscar un personaje…", noResult:"Sin resultados",
    overview:"Vista general", wide:"Familia ampliada", wideHint:"(abuelos, nietos)",
    addPerson:"Añadir un personaje", close:"Cerrar",
    zoomIn:"Acercar", zoomOut:"Alejar", zoomFit:"Mostrar todo",
    legendBtn:"Significado de los símbolos", legendTitle:"Símbolos",
    lgMale:"Hombre", lgFemale:"Mujer", lgUnknown:"No indicado",
    lgUnion:"Unión (● de donde parten los hijos)", lgKin:"Unión entre parientes",
    emptyTitle:"Aún no hay personajes",
    emptyText:(c)=>`Los elementos de la categoría « ${c} » aparecen aquí. Añada uno para empezar el árbol.`,
    goTimeline:"Ver en la línea de tiempo", editItem:"Editar la ficha",
    noteTitle:"Nota genealógica", modify:"Editar", fill:"Rellenar",
    noNote:"Sin nota. « Editar » permite respaldar los vínculos con referencias bíblicas.",
    noFiche:"Este personaje aún no tiene ficha genealógica (sexo desconocido, sin vínculos). « Rellenar » o los botones « Añadir » de abajo permiten vincularlo.",
    family:"Familia", noLinks:"Ningún vínculo registrado.", addLabel:"Añadir",
    father:"Padre", mother:"Madre", parents:"Progenitores", siblings:"Hermanos", halfSiblings:"Medios hermanos",
    wife:"Esposa", husband:"Esposo", spouse:"Cónyuge", children:"Hijos",
    addParent:"+ Progenitor", addChild:"+ Hijo/a",
    unknownM:"desconocido", unknownF:"desconocida", twin:"gemelo",
    byFather:"por el padre", byMother:"por la madre", byParent:"por un progenitor",
    son:"hijo", daughter:"hija", childN:"hijo/a",
    kinTitle:"Unión entre parientes", kinCommon:"antepasado común",
    kinHalf:"medio hermano y media hermana", kinSib:"hermano y hermana",
    kinUncle:(u,su,nv)=>`${u} es ${W(su,'tío','tía','tío o tía')} de ${nv}`,
    kinCousins:"primos hermanos",
    kinUncleBreton:(u,su,nv)=>`${u} es ${W(su,'tío segundo','tía segunda','tío o tía segundo/a')} de ${nv}`,
    kinSecond:"primos segundos", kinFar:"parientes lejanos",
    ficheTitle:"Ficha genealógica", sexLabel:"Sexo", male:"Hombre", female:"Mujer", unknownSex:"No indicado",
    noteLabel:"Nota", refsLabel:"Referencias bíblicas", refsPh:"ej.: Gén 20:12 ; Éx 6:20",
    cancel:"Cancelar", save:"Guardar", ficheSaved:"Ficha genealógica guardada.",
    addTitle:"Añadir un personaje",
    addChildOf:(n)=>`Añadir un hijo/a de ${n}`,
    addSpouseTo:(n,s)=>`Añadir ${W(s,'una esposa','un esposo','un cónyuge')} a ${n}`,
    addParentOf:(n)=>`Añadir un progenitor de ${n}`,
    formNote:(c)=>`El nombre, las fechas, la foto y la descripción van a la línea de tiempo (categoría « ${c} »): el personaje aparecerá también allí. El sexo, la nota, las referencias y los vínculos familiares se guardan en la base genealógica.`,
    fName:"Nombre", fBirth:"Fecha de nacimiento", fDeath:"Fecha de fallecimiento", optional:"(opcional)",
    bce:"a. C.", ce:"d. C.", fApprox:"Fecha aproximada (« hacia… »)", fYearPh:"Año",
    fPhoto:"Foto", fPhotoPh:"Enlace de la imagen (https://…)", fOr:"o",
    fPhotoPrev:"Vista previa: la foto se recortará en el símbolo (cuadrado o redondo).",
    fDesc:"Descripción", fDescHint:"(se muestra en la línea de tiempo)",
    fSection:"Ficha genealógica", fNote:"Nota genealógica", fNotePh:"ej.: hija de Leví, esposa de su sobrino Amram",
    fRels:"Vínculos familiares", fFather:"Padre", fMother:"Madre", fSpouse:"Cónyuge", fChildOf:"Progenitor de", none:"—",
    doAdd:"Añadir",
    errName:"El nombre es obligatorio.",
    errBirth:"La fecha de nacimiento es obligatoria: sin ella, el personaje no se puede situar en la línea de tiempo.",
    errBirthFmt:"Fecha de nacimiento no válida: escriba un año con cifras (p. ej. 1850).",
    errDeath:"Fecha de fallecimiento no válida.", errDeathOrder:"El fallecimiento debe ser posterior al nacimiento.",
    errTwoParents:(n)=>`${n} ya tiene dos progenitores registrados.`,
    errParentSex:(n,p)=>`${n} ya tiene un progenitor de este sexo (${p}).`,
    errCycle:(n)=>`${n} sería a la vez antepasado y descendiente: revise los vínculos familiares.`,
    errSame:"Una misma persona no puede ocupar dos vínculos distintos.",
    added:(n,c)=>`${n} añadido al árbol y a la línea de tiempo (categoría ${c}).`,
    seeded:(a,m,c)=>{
      const p = [];
      if(a) p.push(`${a} personaje${a>1?'s':''} añadido${a>1?'s':''} a la categoría « ${c} »`);
      if(m) p.push(`${m} ya presente${m>1?'s':''}, vinculado${m>1?'s':''} al árbol`);
      return `Árbol genealógico: ${p.join('; ')}.`;
    },
    seededCats:(cats,n)=>{
      const c = cats.length ? `${cats.length>1?'nuevas categorías':'nueva categoría'} (${cats.join(', ')})` : '';
      const p = n ? `${n} personaje${n>1?'s':''} clasificado${n>1?'s':''}` : '';
      return `Árbol genealógico: ${[c,p].filter(Boolean).join('; ')}.`;
    },
    filterBtn:"Filtro", filterTitle:"Resaltar una categoría", filterReset:"Mostrar todo",
    filterHint:"Los demás personajes siguen visibles, pero atenuados.",
    filterNone:"Por ahora ningún personaje tiene otra categoría.",
    filterClear:"Quitar el filtro",
  },
  zh:{
    title:"家谱", railTitle:"家谱",
    searchPh:"搜索人物…", noResult:"无结果",
    overview:"总览", wide:"扩展家族", wideHint:"（祖父母、孙辈）",
    addPerson:"添加人物", close:"关闭",
    zoomIn:"放大", zoomOut:"缩小", zoomFit:"显示全部",
    legendBtn:"符号含义", legendTitle:"符号",
    lgMale:"男", lgFemale:"女", lgUnknown:"未注明",
    lgUnion:"婚姻（● 为子女的起点）", lgKin:"亲属之间的婚姻",
    emptyTitle:"暂无人物",
    emptyText:(c)=>`“${c}”分类下的条目会显示在这里。添加一位人物即可开始绘制家谱。`,
    goTimeline:"在时间轴上查看", editItem:"编辑条目",
    noteTitle:"家谱备注", modify:"编辑", fill:"填写",
    noNote:"暂无备注。点击“编辑”可用经文为亲属关系提供依据。",
    noFiche:"此人物还没有家谱资料（性别未知，没有任何关系）。可点击“填写”或下方的“添加”按钮建立关系。",
    family:"家庭", noLinks:"尚未记录任何关系。", addLabel:"添加",
    father:"父亲", mother:"母亲", parents:"父母", siblings:"兄弟姐妹", halfSiblings:"同父异母／同母异父的兄弟姐妹",
    wife:"妻子", husband:"丈夫", spouse:"配偶", children:"子女",
    addParent:"+ 父母", addChild:"+ 子女",
    unknownM:"不详", unknownF:"不详", twin:"双胞胎",
    byFather:"随父亲", byMother:"随母亲", byParent:"随一方父母",
    son:"儿子", daughter:"女儿", childN:"子女",
    kinTitle:"亲属之间的婚姻", kinCommon:"共同祖先",
    kinHalf:"同父异母或同母异父的兄妹", kinSib:"兄弟姐妹",
    kinUncle:(u,su,nv)=>`${u}是${nv}的${W(su,'叔伯或舅舅','姑姑或姨妈','叔伯姑舅姨')}`,
    kinCousins:"堂（表）兄弟姐妹",
    kinUncleBreton:(u,su,nv)=>`${u}是${nv}的堂（表）${W(su,'叔伯舅','姑姨','叔伯姑舅姨')}`,
    kinSecond:"再从兄弟姐妹", kinFar:"远亲",
    ficheTitle:"家谱资料", sexLabel:"性别", male:"男", female:"女", unknownSex:"未注明",
    noteLabel:"备注", refsLabel:"圣经经文", refsPh:"例如：Gen 20:12 ; Ex 6:20",
    cancel:"取消", save:"保存", ficheSaved:"家谱资料已保存。",
    addTitle:"添加人物",
    addChildOf:(n)=>`为${n}添加子女`,
    addSpouseTo:(n,s)=>`为${n}添加${W(s,'妻子','丈夫','配偶')}`,
    addParentOf:(n)=>`为${n}添加父母`,
    formNote:(c)=>`姓名、日期、照片和描述会进入时间轴（分类“${c}”），该人物也会显示在时间轴上。性别、备注、经文和亲属关系则保存在家谱资料中。`,
    fName:"姓名", fBirth:"出生日期", fDeath:"逝世日期", optional:"（可选）",
    bce:"公元前", ce:"公元", fApprox:"大约日期（“约…”）", fYearPh:"年份",
    fPhoto:"照片", fPhotoPh:"图片链接 (https://…)", fOr:"或",
    fPhotoPrev:"预览：照片会被裁切为符号形状（方形或圆形）。",
    fDesc:"描述", fDescHint:"（显示在时间轴上）",
    fSection:"家谱资料", fNote:"家谱备注", fNotePh:"例如：利未的女儿，嫁给侄儿暗兰",
    fRels:"亲属关系", fFather:"父亲", fMother:"母亲", fSpouse:"配偶", fChildOf:"是其父母", none:"—",
    doAdd:"添加",
    errName:"必须填写姓名。",
    errBirth:"必须填写出生日期，否则无法把此人物放到时间轴上。",
    errBirthFmt:"出生日期无效：请用数字输入年份（例如 1850）。",
    errDeath:"逝世日期无效。", errDeathOrder:"逝世日期必须晚于出生日期。",
    errTwoParents:(n)=>`${n}已经记录了两位父母。`,
    errParentSex:(n,p)=>`${n}已经有一位同性别的父母（${p}）。`,
    errCycle:(n)=>`${n}将同时成为祖先和后代，请检查亲属关系。`,
    errSame:"同一个人不能同时担任两种不同的关系。",
    added:(n,c)=>`已将${n}添加到家谱和时间轴（分类${c}）。`,
    seeded:(a,m,c)=>{
      const p = [];
      if(a) p.push(`已向“${c}”分类添加 ${a} 位人物`);
      if(m) p.push(`${m} 位已存在的人物已并入家谱`);
      return `家谱：${p.join('；')}。`;
    },
    seededCats:(cats,n)=>{
      const c = cats.length ? `新增分类（${cats.join('、')}）` : '';
      const p = n ? `已为 ${n} 位人物分类` : '';
      return `家谱：${[c,p].filter(Boolean).join('；')}。`;
    },
    filterBtn:"筛选", filterTitle:"突出显示某个分类", filterReset:"全部显示",
    filterHint:"其他人物仍然可见，但会淡化。",
    filterNone:"目前人物尚未归入其他分类。",
    filterClear:"取消筛选",
  },
};
let LANG = 'fr';
function t(key, ...args){
  const d = TS[LANG] || TS.fr;
  let v = d[key];
  if(v === undefined) v = TS.fr[key];
  return typeof v === 'function' ? v(...args) : v;
}

/* ============================================================================
   2. CONTENU LIVRÉ AVEC L'APPLICATION : de Térah à Moïse
   ----------------------------------------------------------------------------
   Installé une seule fois par appareil (voir seedIfNeeded). Chaque personnage
   devient un élément de catégorie « Personnage » ; si un personnage de même nom
   et de date voisine existe déjà dans la frise, c'est lui qui est rattaché à
   l'arbre, rien n'est dupliqué ni modifié.
   ⚠ Les dates sont approximatives : elles sont marquées « vers… » et sont à
   vérifier une à une.
   Forme : [clé, nom, naissance, décès, détails]. Années négatives = avant notre ère.
============================================================================ */
const SEED_PERSONS = [
  ['terah','Térah',-2148,-1943,{refs:'Gn 11:31-32', d:"Quitte Ur avec sa famille et meurt à Harân."}],
  ['abraham','Abraham',-2018,-1843,{refs:'Gn 11:26 ; Gn 12:1-4', d:"Appelé à quitter Ur pour Canaan ; ancêtre d'Israël.",
    img:"https://cms-imgp.jw-cdn.org/img/p/1102013273/univ/art/1102013273_univ_cnt_3_xl.jpg", imgPosition:"top center"}],
  ['nahor','Nahor',-2015,null,{}],
  ['haran','Harân',-2012,null,{}],
  ['sara','Sara',-2008,-1881,{d:"Épouse d'Abraham ; mère d'Isaac à 90 ans.", refs:'Gn 21:1-3'}],
  ['agar','Agar',-1960,null,{d:"Servante égyptienne de Sara."}],
  ['ketoura','Ketoura',-1880,null,{refs:'Gn 25:1-4'}],
  ['ismael','Ismaël',-1932,null,{refs:'Gn 16:15-16'}],
  ['madian','Madiân',-1870,null,{}],
  ['isaac','Isaac',-1918,-1738,{refs:'Gn 21:1-7'}],
  ['lot','Loth',-1990,null,{}],
  ['milka','Milka',-1985,null,{}],
  ['betouel','Betouel',-1950,null,{}],
  ['rebecca','Rébecca',-1900,null,{refs:'Gn 24:15'}],
  ['laban','Laban',-1905,null,{}],
  ['esau','Ésaü',-1858,null,{d:"Vend son droit d'aînesse à Jacob.", refs:'Gn 25:29-34'}],
  ['jacob','Jacob',-1858,-1711,{refs:'Gn 32:28', d:"Renommé Israël ; ses douze fils donnent les tribus."}],
  ['lea','Léa',-1800,null,{}],
  ['rachel','Rachel',-1795,null,{}],
  ['bilha','Bilha',-1800,null,{}],
  ['zilpa','Zilpa',-1800,null,{}],
  ['ruben','Ruben',-1773,null,{}],
  ['simeon','Siméon',-1772,null,{}],
  ['levi','Lévi',-1771,null,{}],
  ['juda','Juda',-1770,null,{}],
  ['issacar','Issachar',-1768,null,{}],
  ['zabulon','Zabulon',-1767,null,{}],
  ['dina','Dina',-1766,null,{}],
  ['joseph','Joseph',-1767,-1657,{refs:'Gn 30:22-24'}],
  ['benjamin','Benjamin',-1750,null,{}],
  ['dan','Dan',-1770,null,{}],
  ['nephtali','Nephtali',-1769,null,{}],
  ['gad','Gad',-1769,null,{}],
  ['aser','Aser',-1768,null,{}],
  ['asenath','Asenath',-1750,null,{}],
  ['manasse','Manassé',-1737,null,{}],
  ['ephraim','Éphraïm',-1736,null,{}],
  ['bathshua','Fille de Shoua',-1760,null,{}],
  ['er','Er',-1745,null,{}],
  ['onan','Onân',-1744,null,{}],
  ['shela','Shéla',-1743,null,{}],
  ['tamar','Tamar',-1745,null,{}],
  ['perez','Pérez',-1725,null,{}],
  ['zerah','Zérah',-1725,null,{}],
  ['guershon','Guershôn',-1745,null,{}],
  ['kehath','Kehath',-1740,null,{}],
  ['merari','Merari',-1735,null,{}],
  ['jokebed','Yokébed',-1720,null,{}],
  ['amram','Amram',-1700,null,{}],
  ['miriam','Miriam',-1605,null,{}],
  ['aaron','Aaron',-1597,-1474,{}],
  ['moise','Moïse',-1593,-1473,{refs:'Ex 2:1-10'}],
  ['sephora','Séphora',-1580,null,{}],
  ['elisheba','Élishéba',-1600,null,{}],
  ['nadab','Nadab',-1570,null,{}],
  ['abihou','Abihou',-1568,null,{}],
  ['eleazar','Éléazar',-1565,null,{}],
  ['itamar','Itamar',-1560,null,{}],
  ['guershom','Guershom',-1550,null,{}],
  ['eliezer','Éliézer',-1545,null,{}],
];
// Autres graphies courantes, pour reconnaître un personnage déjà saisi (les accents et majuscules sont ignorés)
const SEED_ALIASES = {
  terah:['Térach','Thérah'], nahor:['Nachor'], haran:['Haran','Aran'], sara:['Sarah','Saraï','Sarai'],
  agar:['Hagar'], ketoura:['Cetura','Qetoura','Ketourah'], madian:['Madian'], lot:['Lot'], milka:['Milca'],
  betouel:['Bethuel','Bethouel','Betuel'], juda:['Judah'], issacar:['Issachar'], nephtali:['Nephthali'],
  aser:['Asher'], asenath:['Asnath'], manasse:['Manasseh'], ephraim:['Ephraïm'], shela:['Shelah'],
  tamar:['Thamar'], perez:['Pharès','Pérets','Perets'], zerah:['Zara','Zarah'], guershon:['Gershon','Guerchon'],
  kehath:['Qehath','Kehat'], jokebed:['Jokébed','Jochebed','Yokebed'], aaron:['Aharon'], moise:['Moses'],
  sephora:['Zipporah','Tsippora','Zéphora'], abihou:['Abihu'], itamar:['Ithamar'], guershom:['Gershom','Guerchom'],
  eliezer:['Eliézer'],
};
const SEED_WOMEN = ['sara','agar','ketoura','milka','rebecca','lea','rachel','bilha','zilpa','dina','asenath',
  'bathshua','tamar','jokebed','miriam','sephora','elisheba'];
// Notes généalogiques : [note, références] — elles justifient les liens (distinctes de la description de la frise)
const SEED_NOTES = {
  terah:   ["Père d'Abraham, de Nahor et d'Harân ; aussi père de Sara, d'une autre femme.", "Gn 11:26-27 ; Gn 20:12"],
  sara:    ["Demi-sœur d'Abraham : « la fille de mon père, mais pas la fille de ma mère ».", "Gn 20:12"],
  milka:   ["Fille d'Harân, épouse de son oncle Nahor.", "Gn 11:29"],
  betouel: ["Fils de Nahor et Milka ; père de Rébecca et de Laban.", "Gn 22:20-23 ; Gn 24:29"],
  rebecca: ["Petite-fille de Nahor, le frère d'Abraham.", "Gn 24:15"],
  esau:    ["Jumeau de Jacob, né le premier.", "Gn 25:24-26"],
  jacob:   ["Jumeau d'Ésaü. Quatre épouses : Léa, Rachel, Bilha, Zilpa.", "Gn 25:24-26 ; Gn 35:23-26"],
  lea:     ["Fille aînée de Laban, cousine de Jacob.", "Gn 29:16"],
  rachel:  ["Fille cadette de Laban.", "Gn 29:16"],
  tamar:   ["Veuve d'Er, puis mère de Pérez et Zérah avec Juda.", "Gn 38:6 ; Gn 38:27-30"],
  perez:   ["Jumeau de Zérah.", "Gn 38:27-30"],
  jokebed: ["Fille de Lévi, épouse de son neveu Amram.", "Ex 6:20 ; Nb 26:59"],
  elisheba:["Fille d'Amminadab, sœur de Nahshôn (tribu de Juda).", "Ex 6:23"],
  moise:   ["Fils d'Amram et Yokébed ; frère d'Aaron et Miriam.", "Ex 6:20 ; Nb 26:59"],
};
// Familles : une par union (ou par parent seul). jumeaux : type 'monozygote', 'dizygote' ou null (inconnu)
const SEED_FAMILIES = [
  {id:'f_terah_1', partenaires:['terah'], enfants:['abraham','nahor','haran']},
  {id:'f_terah_2', partenaires:['terah'], enfants:['sara']},
  {id:'f_abr_sara', partenaires:['abraham','sara'], enfants:['isaac']},
  {id:'f_abr_agar', partenaires:['abraham','agar'], enfants:['ismael']},
  {id:'f_abr_ket', partenaires:['abraham','ketoura'], enfants:['madian']},
  {id:'f_haran', partenaires:['haran'], enfants:['lot','milka']},
  {id:'f_nahor', partenaires:['nahor','milka'], enfants:['betouel']},
  {id:'f_betouel', partenaires:['betouel'], enfants:['rebecca','laban']},
  {id:'f_isaac', partenaires:['isaac','rebecca'], enfants:['esau','jacob'], jumeaux:[{membres:['esau','jacob'],type:'dizygote'}]},
  {id:'f_laban', partenaires:['laban'], enfants:['lea','rachel']},
  {id:'f_jacob_lea', partenaires:['jacob','lea'], enfants:['ruben','simeon','levi','juda','issacar','zabulon','dina']},
  {id:'f_jacob_rachel', partenaires:['jacob','rachel'], enfants:['joseph','benjamin']},
  {id:'f_jacob_bilha', partenaires:['jacob','bilha'], enfants:['dan','nephtali']},
  {id:'f_jacob_zilpa', partenaires:['jacob','zilpa'], enfants:['gad','aser']},
  {id:'f_joseph', partenaires:['joseph','asenath'], enfants:['manasse','ephraim']},
  {id:'f_juda_shua', partenaires:['juda','bathshua'], enfants:['er','onan','shela']},
  {id:'f_er', partenaires:['er','tamar'], enfants:[]},
  {id:'f_juda_tamar', partenaires:['juda','tamar'], enfants:['perez','zerah'], jumeaux:[{membres:['perez','zerah'],type:null}]},
  {id:'f_levi', partenaires:['levi'], enfants:['guershon','kehath','merari','jokebed']},
  {id:'f_kehath', partenaires:['kehath'], enfants:['amram']},
  {id:'f_amram', partenaires:['amram','jokebed'], enfants:['miriam','aaron','moise']},
  {id:'f_aaron', partenaires:['aaron','elisheba'], enfants:['nadab','abihou','eleazar','itamar']},
  {id:'f_moise', partenaires:['moise','sephora'], enfants:['guershom','eliezer']},
];

/* Catégories livrées avec l'arbre (version 2 du contenu, v0.10.1)
   Créées une seule fois par appareil, si leur clé n'existe pas encore. Les clés sont celles que l'application
   fabriquerait elle-même à partir du nom (« Lignée de Jésus » → lignee_de_jesus) : une catégorie du même nom
   créée à la main est donc reconnue et réutilisée au lieu d'être doublée.
   « Personnage » reste toujours la première catégorie d'un personnage : c'est elle qui donne sa couleur sur la frise. */
const SEED_CATS = [
  {id:'principal', key:'personnage_principal', label:'Personnage principal', color:'#A9761C'},
  {id:'jesus',     key:'lignee_de_jesus',      label:'Lignée de Jésus',      color:'#7A64B5'},
  {id:'levi',      key:'lignee_levite',        label:'Lignée Lévite',        color:'#B8662F'},
  {id:'tribus',    key:'12_tribus',            label:'12 Tribus',            color:'#3A7CA5'},
];
/* Qui reçoit quelle catégorie (clés de SEED_PERSONS).
   • principal : les figures centrales de Genèse–Exode, pour alléger la vue globale de la frise.
   • jesus     : les ancêtres de Jésus dans cet intervalle (Mt 1:2-3 ; Lc 3:33-34), mères comprises :
                 Sara, Rébecca, Léa et Tamar sont ses aïeules directes, ce qui garde la lignée continue dans l'arbre.
   • levi      : Lévi et ses descendants par le sang. Élishéba (de Juda) et Séphora (Madianite) n'en font pas partie.
   • tribus    : les douze fils de Jacob. Éphraïm et Manassé, qui ont donné deux tribus à la place de Joseph, n'y sont pas. */
const SEED_TAGS = {
  principal: ['abraham','isaac','jacob','joseph','moise'],
  jesus:     ['terah','abraham','sara','isaac','rebecca','jacob','lea','juda','tamar','perez'],
  levi:      ['levi','guershon','kehath','merari','jokebed','amram','miriam','aaron','moise','nadab','abihou','eleazar','itamar','guershom','eliezer'],
  tribus:    ['ruben','simeon','levi','juda','issacar','zabulon','joseph','benjamin','dan','nephtali','gad','aser'],
};

/* ============================================================================
   3. ÉTAT GÉNÉALOGIQUE, INDEX ET OUTILS
   ----------------------------------------------------------------------------
   « state » est la base généalogique, la seule chose que ce fichier enregistre.
   L'index (byId, famsOf, origOf…) n'en est qu'une vue de lecture, reconstruite
   à la demande : il ne garde que les personnes qui existent encore dans la frise
   et ignore tout lien devenu incohérent. Toute modification passe par « state ».
============================================================================ */
let api = null;                  // objet transmis par app.js (voir init)
const state = {v:1, init:0, fiches:{}, familles:[]};
let locked = false;              // vrai si la base généalogique n'a pas pu être lue : on n'y touche plus

const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const uniq = a => [...new Set(a)];
const opp = s => s==='M' ? 'F' : s==='F' ? 'M' : null;
const sortYear = it => it.isPeriod ? it.start : it.y;            // pour trier et rapprocher les dates
const startYear = it => it.isPeriod ? (it.startYear!=null ? it.startYear : Math.floor(it.start)) : (it.year!=null ? it.year : Math.floor(it.y));
const endYear = it => it.isPeriod ? (it.endYear!=null ? it.endYear : Math.floor(it.end)) : null;
function newFamId(){ return 'f_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

/* ---------- Nettoyage : tout ce qui vient du disque ou d'un fichier reçu passe par là ---------- */
function cleanFiche(f){
  const o = {sexe:(f && (f.sexe==='M' || f.sexe==='F')) ? f.sexe : null};
  if(f && typeof f.note==='string' && f.note.trim()) o.note = f.note.trim();
  if(f && typeof f.refs==='string' && f.refs.trim()) o.refs = f.refs.trim();
  return o;
}
function cleanFamily(f){
  if(!f || typeof f!=='object') return null;
  const strs = a => uniq((Array.isArray(a) ? a : []).filter(x=>typeof x==='string' && x));
  const ps = strs(f.partenaires).slice(0,2);
  if(!ps.length) return null;
  const cs = strs(f.enfants).filter(c=>!ps.includes(c));
  const nf = {id:(typeof f.id==='string' && f.id) ? f.id : newFamId(), partenaires:ps, enfants:cs};
  const tw = (Array.isArray(f.jumeaux) ? f.jumeaux : []).map(g=>({
    membres: strs(g && g.membres).filter(m=>cs.includes(m)),
    type: (g && (g.type==='monozygote' || g.type==='dizygote')) ? g.type : null
  })).filter(g=>g.membres.length>1);
  if(tw.length) nf.jumeaux = tw;
  return nf;
}
function normalizeState(raw){
  const s = {v:1, init:0, fiches:{}, familles:[]};
  if(!raw || typeof raw!=='object') return s;
  s.init = Number(raw.init) || 0;
  if(raw.fiches && typeof raw.fiches==='object'){
    Object.keys(raw.fiches).forEach(k=>{ if(k!=='__proto__') s.fiches[k] = cleanFiche(raw.fiches[k]); });
  }
  if(Array.isArray(raw.familles)){
    raw.familles.forEach(f=>{ const nf = cleanFamily(f); if(nf) s.familles.push(nf); });
  }
  return s;
}
function setState(raw){
  const s = normalizeState(raw);
  state.init = s.init; state.fiches = s.fiches; state.familles = s.familles;
  dirtyIdx();
}
// Retire de la base ce qui renvoie à un élément supprimé de la frise. Rien n'est retiré tant que la frise est vide :
// un chargement raté ne doit jamais effacer la généalogie.
function prune(){
  const items = api ? api.getItems() : [];
  if(!items.length) return;
  const ids = new Set(items.map(i=>i.id));
  Object.keys(state.fiches).forEach(k=>{ if(!ids.has(k)) delete state.fiches[k]; });
  const out = [];
  state.familles.forEach(f=>{
    const ps = f.partenaires.filter(p=>ids.has(p)), cs = f.enfants.filter(c=>ids.has(c));
    if(!ps.length || (ps.length===1 && !cs.length)) return;
    const nf = {id:f.id, partenaires:ps, enfants:cs};
    if(f.jumeaux){
      const j = f.jumeaux.map(g=>({membres:g.membres.filter(m=>cs.includes(m)), type:g.type})).filter(g=>g.membres.length>1);
      if(j.length) nf.jumeaux = j;
    }
    out.push(nf);
  });
  state.familles = out;
  dirtyIdx();
}
function getState(){
  if(locked) return null;
  prune();
  return JSON.parse(JSON.stringify(state));
}
// Toute modification de la base passe par ici : l'index est invalidé et l'enregistrement demandé
function changed(){ dirtyIdx(); if(api) api.requestSave(); }

/* ---------- Index de lecture ---------- */
let IDX_OK = false;
let byId, isP, PEOPLE, FAMS, famsOf, origOf, twinOf;
function dirtyIdx(){ IDX_OK = false; }
function ensureIndex(){
  if(IDX_OK) return;
  byId = Object.create(null); isP = Object.create(null); PEOPLE = [];
  api.getItems().forEach(it=>{ if(api.isPerson(it)){ byId[it.id] = it; isP[it.id] = true; PEOPLE.push(it); } });
  famsOf = Object.create(null); origOf = Object.create(null); twinOf = Object.create(null); FAMS = [];
  state.familles.forEach(f=>{
    const ps = f.partenaires.filter(p=>isP[p]);
    if(!ps.length) return;
    // un enfant n'a qu'une famille d'origine : la première rencontrée l'emporte
    // et jamais l'ancêtre de l'un de ses propres parents (un lien incohérent est ignoré, pas dessiné)
    const cs = f.enfants.filter(c=>isP[c] && !ps.includes(c) && !origOf[c] && !ps.some(p=>ancestors(p,200).has(c)));
    if(ps.length===1 && !cs.length) return;
    const nf = {id:f.id, partenaires:ps, enfants:cs, jumeaux:f.jumeaux};
    FAMS.push(nf);
    ps.forEach(p=>{ (famsOf[p] || (famsOf[p] = [])).push(nf); });
    cs.forEach(c=>{ origOf[c] = nf; });
    (nf.jumeaux || []).forEach((g,i)=>g.membres.forEach(m=>{ if(cs.includes(m)) twinOf[m] = {groupe:nf.id+'_'+i, type:g.type}; }));
  });
  IDX_OK = true;
}
const sexOf = id => (state.fiches[id] || {}).sexe || null;
const fams = id => famsOf[id] || [];
const orig = id => origOf[id] || null;
const other = (f,id) => f.partenaires.find(p=>p!==id) || null;
const parentsOf = id => { const f = orig(id); return f ? f.partenaires : []; };
const allKids = id => fams(id).flatMap(f=>f.enfants);
const nameOf = id => byId[id] ? byId[id].t : '';

// Ancêtres jusqu'à maxD générations : Map(identifiant → génération)
function ancestors(id, maxD){
  const out = new Map([[id,0]]); let front = [id];
  for(let d=1; d<=maxD && front.length; d++){
    const nx = [];
    front.forEach(p=>parentsOf(p).forEach(a=>{ if(!out.has(a)){ out.set(a,d); nx.push(a); } }));
    front = nx;
  }
  return out;
}
const isAncestor = (x,y) => x!==y && ancestors(y,60).has(x);
// Parenté entre deux personnes (pour signaler une union consanguine)
function kinship(a, b, K=3){
  const A = ancestors(a,K), B = ancestors(b,K);
  let best = null;
  A.forEach((da,c)=>{
    if(c===a || c===b || !B.has(c)) return;
    const db = B.get(c), s = da+db;
    if(!best || s<best.sum) best = {sum:s, da, db, commons:[c]};
    else if(s===best.sum && da===best.da) best.commons.push(c);
  });
  if(!best) return null;
  const {da, db} = best, na = nameOf(a), nb = nameOf(b), sa = sexOf(a), sb = sexOf(b);
  let label;
  if(da===1 && db===1) label = best.commons.length<2 ? t('kinHalf') : t('kinSib');
  else if(Math.min(da,db)===1 && Math.max(da,db)===2){
    const [u,su,nv] = da===1 ? [na,sa,nb] : [nb,sb,na]; label = t('kinUncle', u, su, nv);
  }
  else if(da===2 && db===2) label = t('kinCousins');
  else if(Math.min(da,db)===2 && Math.max(da,db)===3){
    const [u,su,nv] = da===2 ? [na,sa,nb] : [nb,sb,na]; label = t('kinUncleBreton', u, su, nv);
  }
  else if(da===3 && db===3) label = t('kinSecond');
  else label = t('kinFar');
  return Object.assign({}, best, {label});
}

/* ============================================================================
   4. INSTALLATION DU CONTENU LIVRÉ, EXPORT ET IMPORT
============================================================================ */
// Rapproche les personnages du semis d'éléments déjà présents (même nom ou graphie voisine, date à ±SEED_TOLERANCE ans).
// Renvoie {clé du semis → identifiant de l'élément} pour ceux qui ont été reconnus.
function matchSeedPersons(candidates){
  const byName = new Map();
  const addName = (n, it) => {
    const k = norm(n).trim(); if(!k) return;
    if(!byName.has(k)) byName.set(k, []);
    byName.get(k).push(it);
  };
  candidates.forEach(it=>{ addName(it.t, it); addName(String(it.t).split(',')[0], it); });
  const used = new Set(), idOf = {};
  SEED_PERSONS.forEach(([key, name, birth])=>{
    for(const n of [name].concat(SEED_ALIASES[key] || [])){
      const found = (byName.get(norm(n)) || []).find(it=>!used.has(it.id) && Math.abs(sortYear(it)-birth) <= SEED_TOLERANCE);
      if(found){ idOf[key] = found.id; used.add(found.id); return; }
    }
  });
  return idOf;
}

// Étape 1 (v0.10.0) : les personnages de départ et leurs liens. Un personnage déjà saisi de même nom et de date voisine
// est rattaché à l'arbre au lieu d'être recréé.
function installSeed(res){
  // Une généalogie déjà présente (fichier de départ, import) : on la respecte, on ne la double pas
  if(Object.keys(state.fiches).length || state.familles.length) return;
  const idOf = matchSeedPersons(api.getItems().filter(api.isPerson));
  SEED_PERSONS.forEach(([key, name, birth, death, x])=>{
    if(idOf[key]){ res.matched++; return; }
    idOf[key] = api.addPerson({t:name, birth, death, approx:true, d:x.d || '', bibleRefs:x.refs || null,
      img:x.img || null, imgPosition:x.imgPosition || null}).id;
    res.added++;
  });
  SEED_PERSONS.forEach(([key])=>{
    const f = {sexe: SEED_WOMEN.includes(key) ? 'F' : 'M'};
    if(SEED_NOTES[key]){ f.note = SEED_NOTES[key][0]; f.refs = SEED_NOTES[key][1]; }
    state.fiches[idOf[key]] = f;
  });
  SEED_FAMILIES.forEach(sf=>{
    const nf = {id:sf.id, partenaires:sf.partenaires.map(k=>idOf[k]), enfants:sf.enfants.map(k=>idOf[k])};
    if(sf.jumeaux) nf.jumeaux = sf.jumeaux.map(g=>({membres:g.membres.map(k=>idOf[k]), type:g.type}));
    state.familles.push(nf);
  });
}

// Étape 2 (v0.10.1) : crée les catégories livrées, puis les attribue aux personnages du semis présents dans l'arbre.
// On ajoute seulement : jamais une catégorie n'est retirée, et comme l'étape n'a lieu qu'une fois par appareil,
// une catégorie retirée ensuite à la main ne revient pas. Un personnage renommé ou supprimé n'est simplement pas reconnu.
function tagSeed(res){
  const keyOf = {};
  SEED_CATS.forEach(c=>{
    const r = api.ensureCategory({key:c.key, label:c.label, color:c.color});
    if(!r) return;
    keyOf[c.id] = r.key;
    if(r.created) res.cats.push(c.label);
  });
  const cand = api.getItems().filter(it=>api.isPerson(it) && state.fiches[it.id]);
  const idOf = matchSeedPersons(cand), item = new Map(cand.map(it=>[it.id, it]));
  const want = {};   // identifiant d'élément → clés de catégories à ajouter
  Object.keys(SEED_TAGS).forEach(cid=>{
    if(!keyOf[cid]) return;
    SEED_TAGS[cid].forEach(k=>{ if(idOf[k]) (want[idOf[k]] || (want[idOf[k]] = [])).push(keyOf[cid]); });
  });
  Object.keys(want).forEach(id=>{ if(api.addCategories(item.get(id), want[id]) > 0) res.tagged++; });
}

// Installe ce qui manque du contenu livré, une seule fois par étape et par appareil (state.init mémorise l'étape atteinte).
// Renvoie null si rien à faire, sinon {added, matched, tagged, cats} : personnages créés, personnages déjà présents
// rattachés, personnages ayant reçu au moins une catégorie, noms des catégories créées.
function seedIfNeeded(){
  if(locked || state.init >= SEED_VERSION) return null;
  const from = state.init, res = {added:0, matched:0, tagged:0, cats:[]};
  if(state.init < 1){ installSeed(res); state.init = 1; }
  // application plus ancienne que ce fichier (mise à jour en cours) : l'étape 2 attendra le prochain lancement
  if(state.init < 2 && typeof api.ensureCategory === 'function' && typeof api.addCategories === 'function'){
    tagSeed(res);
    state.init = 2;
  }
  dirtyIdx();
  return state.init > from ? res : null;
}
function seedMessage(res){
  if(!res) return null;
  if(res.added || res.matched) return t('seeded', res.added, res.matched, catName());
  if(res.cats.length || res.tagged) return t('seededCats', res.cats, res.tagged);
  return null;
}

// Export : les liens des seuls personnages exportés (ids = ensemble d'identifiants d'éléments)
function exportFor(ids){
  const fiches = {};
  ids.forEach(id=>{ if(state.fiches[id]) fiches[id] = JSON.parse(JSON.stringify(state.fiches[id])); });
  const familles = [];
  state.familles.forEach(f=>{
    const ps = f.partenaires.filter(p=>ids.has(p)), cs = f.enfants.filter(c=>ids.has(c));
    if(!(ps.length>=2 || (ps.length===1 && cs.length))) return;
    const nf = {id:f.id, partenaires:ps, enfants:cs};
    if(f.jumeaux){
      const j = f.jumeaux.map(g=>({membres:g.membres.filter(m=>cs.includes(m)), type:g.type})).filter(g=>g.membres.length>1);
      if(j.length) nf.jumeaux = j;
    }
    familles.push(nf);
  });
  if(!Object.keys(fiches).length && !familles.length) return null;
  return {v:1, fiches, familles};
}
// Import : idMap (Map) traduit l'identifiant que portait l'élément dans le fichier ("gid") en identifiant local
function importFrom(g, idMap){
  const res = {fiches:0, familles:0};
  if(locked || !g || typeof g!=='object' || !idMap) return res;
  const s = normalizeState({fiches:g.fiches, familles:g.familles});
  Object.keys(s.fiches).forEach(gid=>{
    const id = idMap.get(gid);
    if(id){ state.fiches[id] = s.fiches[gid]; res.fiches++; }
  });
  s.familles.forEach(f=>{
    const ps = f.partenaires.map(x=>idMap.get(x)).filter(Boolean);
    if(!ps.length) return;
    const cs = f.enfants.map(x=>idMap.get(x)).filter(Boolean);
    if(ps.length===1 && !cs.length) return;
    const nf = {id:newFamId(), partenaires:ps, enfants:cs};
    if(f.jumeaux){
      const j = f.jumeaux.map(gr=>({membres:gr.membres.map(x=>idMap.get(x)).filter(Boolean), type:gr.type})).filter(gr=>gr.membres.length>1);
      if(j.length) nf.jumeaux = j;
    }
    state.familles.push(nf); res.familles++;
  });
  if(res.fiches || res.familles) changed();
  return res;
}
const catName = () => (api && api.catLabel) ? api.catLabel(PERSON_CAT) : 'Personnage';

/* ============================================================================
   5. PLACEMENT GLOBAL — tous les personnages, une seule fois chacun
   ----------------------------------------------------------------------------
   a) Rattachement : un conjoint « sans parents connus » (Agar, Bilha, Tamar…)
      est rangé à côté de son conjoint. Les autres restent sous leurs parents.
   b) Générations : un enfant est toujours sous ses deux parents ; deux époux
      sont alignés sur la même ligne quand c'est possible.
   c) Bandes : chaque famille occupe une bande verticale exclusive, les
      enfants sont centrés sous leurs parents → aucun chevauchement.
   d) Les personnages sans aucun lien sont rangés à part, en grille, à droite.
============================================================================ */
const SLOT = 104, ROW = 150, R = 23, FAMGAP = 0.45, ROOTGAP = 0.9;

function computeLayout(){
  ensureIndex();
  const persons = PEOPLE.map(p=>p.id);
  const anchor = Object.create(null);
  // a) rattachement des conjoints sans parents
  persons.forEach(p=>{
    if(orig(p)) return;
    const fs = fams(p).filter(f=>f.partenaires.length===2); if(!fs.length) return;
    const f = fs.find(x=>x.enfants.length) || fs[0], q = other(f,p);
    if(!orig(q)){
      const pM = sexOf(p)==='M', qM = sexOf(q)==='M';
      if(pM && !qM) return;
      if(pM===qM && p<q) return;
    }
    anchor[p] = q;
  });
  // une épouse dont les parents sont connus est aussi rangée à côté de son mari
  // (sa famille proche reste groupée ; c'est le lien vers ses parents qui s'allonge)
  FAMS.forEach(f=>{
    if(f.partenaires.length<2 || !f.enfants.length) return;
    const w = f.partenaires.find(p=>sexOf(p)==='F'), m = f.partenaires.find(p=>sexOf(p)==='M');
    if(!w || !m || anchor[w] || anchor[m] || !orig(w)) return;
    if(isAncestor(w,m) || isAncestor(m,w)) return;
    if(Object.values(anchor).includes(w)) return;
    anchor[w] = m;
  });
  const hostOf = p => { let h = p, guard = 0; while(anchor[h] && guard++<20) h = anchor[h]; return h; };
  const unitHost = Object.create(null); persons.forEach(p=>{ unitHost[p] = hostOf(p); });
  const members = Object.create(null);
  persons.forEach(p=>{
    const h = unitHost[p];
    if(!members[h]) members[h] = [h];
    if(h!==p) members[h].push(p);
  });
  Object.keys(members).forEach(h=>{
    const ms = members[h];
    const fi = p => p===h ? -1 : fams(h).findIndex(f=>f.partenaires.includes(p));
    ms.sort((a,b)=>fi(a)-fi(b));
  });
  // b) générations
  const gen = Object.create(null); persons.forEach(p=>{ gen[p] = 0; });
  for(let it=0; it<300; it++){
    let ch = false;
    FAMS.forEach(f=>{
      const g = Math.max(...f.partenaires.map(p=>gen[p] || 0)) + 1;
      f.enfants.forEach(c=>{ if(gen[c]<g){ gen[c] = g; ch = true; } });
    });
    persons.forEach(p=>{
      const h = unitHost[p]; if(h===p || gen[p]===gen[h]) return;
      if(orig(p)){
        const tg = Math.max(gen[p], gen[h]);
        if(gen[p]!==tg){ gen[p] = tg; ch = true; }
        if(gen[h]!==tg && !isAncestor(h,p)){ gen[h] = tg; ch = true; }
      } else { gen[p] = gen[h]; ch = true; }
    });
    FAMS.forEach(f=>{
      if(f.partenaires.length<2) return;
      const [a,b] = f.partenaires;
      if(unitHost[a]!==a || unitHost[b]!==b || gen[a]===gen[b]) return;
      const [lo,hi] = gen[a]<gen[b] ? [a,b] : [b,a];
      if(!isAncestor(lo,hi)){ gen[lo] = gen[hi]; ch = true; }
    });
    if(!ch) break;
  }
  // c) bandes
  const famHost = f => {
    if(f.partenaires.length===1) return unitHost[f.partenaires[0]];
    const [a,b] = f.partenaires;
    if(unitHost[a]===unitHost[b]) return unitHost[a];
    const m = f.partenaires.find(p=>sexOf(p)==='M') || a;
    return unitHost[m];
  };
  const hostedFams = Object.create(null);
  FAMS.forEach(f=>{ if(f.enfants.length){ const h = famHost(f); (hostedFams[h] || (hostedFams[h] = [])).push(f); } });
  // ordre : familles des membres de l'unité, dans l'ordre des membres
  Object.keys(hostedFams).forEach(h=>{
    const ord = members[h] || [h];
    const rank = f => Math.min(...f.partenaires.map(p=>ord.indexOf(p)).filter(i=>i>=0));
    hostedFams[h].sort((x,y)=>rank(x)-rank(y));
  });
  // placement compact (contours) : chaque sous-arbre est poussé contre son voisin,
  // génération par génération, sans jamais se chevaucher
  const lay = (h, depth) => {
    const mem = members[h] || [h], g0 = gen[h], pos = {}, cont = {};
    const ext = (g,l,r) => { if(!cont[g]) cont[g] = [l,r]; else { cont[g][0] = Math.min(cont[g][0],l); cont[g][1] = Math.max(cont[g][1],r); } };
    const kidX = []; let first = true;
    (hostedFams[h] || []).forEach(f=>{
      f.enfants.filter(c=>unitHost[c]===c).forEach((c,j)=>{
        const S = depth>200 ? {pos:{[c]:0}, cont:{[gen[c]]:[0,0]}} : lay(c, depth+1);
        let shift = 0;
        if(!first){
          const gap = j===0 ? 1+FAMGAP : 1; shift = -Infinity;
          Object.keys(S.cont).forEach(g=>{ if(cont[g]) shift = Math.max(shift, cont[g][1]+gap-S.cont[g][0]); });
          if(shift===-Infinity){
            const R0 = Math.max(...Object.values(cont).map(v=>v[1])), L0 = Math.min(...Object.values(S.cont).map(v=>v[0]));
            shift = R0+gap-L0;
          }
        }
        first = false;
        Object.entries(S.pos).forEach(([p,x])=>{ pos[p] = x+shift; });
        Object.entries(S.cont).forEach(([g,[l,r]])=>ext(g,l+shift,r+shift));
        kidX.push(S.pos[c]+shift);
      });
    });
    const n = mem.length, ux = kidX.length ? (Math.min(...kidX)+Math.max(...kidX))/2-(n-1)/2 : 0;
    mem.forEach((p,i)=>{ pos[p] = ux+i; });
    ext(g0, ux, ux+n-1);
    return {pos, cont};
  };
  const pos = {}, acc = {};
  const putRoot = (r, gap) => {
    const S = lay(r, 0); let shift = -Infinity;
    Object.keys(S.cont).forEach(g=>{ if(acc[g]) shift = Math.max(shift, acc[g][1]+gap-S.cont[g][0]); });
    if(shift===-Infinity){
      shift = Object.keys(acc).length
        ? Math.max(...Object.values(acc).map(v=>v[1]))+gap-Math.min(...Object.values(S.cont).map(v=>v[0]))
        : 0;
    }
    Object.entries(S.pos).forEach(([p,x])=>{ pos[p] = {x:x+shift}; });
    Object.entries(S.cont).forEach(([g,[l,rr]])=>{
      if(!acc[g]) acc[g] = [l+shift, rr+shift];
      else { acc[g][0] = Math.min(acc[g][0], l+shift); acc[g][1] = Math.max(acc[g][1], rr+shift); }
    });
  };
  const roots = persons.filter(p=>unitHost[p]===p && !orig(p));
  const byBirth = (a,b) => sortYear(byId[a]) - sortYear(byId[b]);
  const linked = roots.filter(r=>(members[r] || []).length>1 || (hostedFams[r] || []).length).sort(byBirth);
  const alone = roots.filter(r=>!linked.includes(r)).sort(byBirth);
  linked.forEach(r=>putRoot(r, 1+ROOTGAP));
  // d) personnages sans lien : une grille aussi carrée que possible, à droite de l'arbre.
  // Filet de sécurité : un personnage qu'aucune branche n'a placé (liens incohérents) rejoint cette grille,
  // il ne disparaît jamais de l'arbre.
  const lost = persons.filter(p=>!pos[p] && !alone.includes(p)).sort((a,b)=>byBirth(a,b));
  const grid = alone.concat(lost);
  const xs = Object.values(pos).map(v=>v.x);
  const x0 = xs.length ? Math.max(...xs)+1.6 : 0;
  const cols = Math.max(1, Math.min(grid.length, Math.ceil(Math.sqrt(grid.length*ROW/SLOT))));
  grid.forEach((r,i)=>{ pos[r] = {x:x0+(i%cols), row:Math.floor(i/cols)}; });
  const nodes = {};
  persons.forEach(p=>{
    if(pos[p]) nodes[p] = {pid:p, X:pos[p].x*SLOT, Y:(pos[p].row!=null ? pos[p].row : gen[p])*ROW, unitHost:unitHost[p], alone:pos[p].row!=null};
  });
  return {nodes, members, unitHost, famHost};
}

/* ============================================================================
   6. DESSIN — médaillons et liens arrondis
============================================================================ */
// polyligne orthogonale aux angles arrondis
function rpath(pts, r=11){
  const Q = pts.filter((p,i)=>i===0 || Math.hypot(p[0]-pts[i-1][0], p[1]-pts[i-1][1])>0.5);
  if(Q.length<2) return '';
  let d = `M${Q[0][0].toFixed(1)} ${Q[0][1].toFixed(1)}`;
  for(let i=1; i<Q.length-1; i++){
    const [a,b,c] = [Q[i-1], Q[i], Q[i+1]];
    const l1 = Math.hypot(b[0]-a[0], b[1]-a[1]), l2 = Math.hypot(c[0]-b[0], c[1]-b[1]), rr = Math.min(r, l1/2, l2/2);
    const p1 = [b[0]-(b[0]-a[0])/l1*rr, b[1]-(b[1]-a[1])/l1*rr], p2 = [b[0]+(c[0]-b[0])/l2*rr, b[1]+(c[1]-b[1])/l2*rr];
    d += ` L${p1[0].toFixed(1)} ${p1[1].toFixed(1)} Q${b[0].toFixed(1)} ${b[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  const z = Q[Q.length-1];
  return d+` L${z[0].toFixed(1)} ${z[1].toFixed(1)}`;
}
const sexCls = s => s==='M' ? 'm' : s==='F' ? 'f' : 'n';
function initials(name){
  const w = String(name).replace(/[«»"']/g,'').split(/\s+/).filter(x=>x.length>2 || /^[A-ZÀ-Ý]/.test(x));
  const a = (w[0] || name || '?')[0], b = w.length>1 && w[1][0]===w[1][0].toUpperCase() ? w[1][0] : '';
  return (a+b).toUpperCase();
}
function parAspect(pos){
  const m = {'top left':'xMinYMin', 'top center':'xMidYMin', 'top right':'xMaxYMin',
    'center left':'xMinYMid', 'center center':'xMidYMid', 'center right':'xMaxYMid',
    'bottom left':'xMinYMax', 'bottom center':'xMidYMax', 'bottom right':'xMaxYMax'};
  return (m[pos] || 'xMidYMid')+' slice';
}
// Homme : carré arrondi ; femme et non renseigné : rond (non renseigné en pointillés)
function medallion(pid){
  const it = byId[pid], s = sexOf(pid), c = sexCls(s);
  const shp = s==='M'
    ? cls => `<rect class="${cls}" x="${-R}" y="${-R}" width="${2*R}" height="${2*R}" rx="14"/>`
    : cls => `<circle class="${cls}" r="${R+1}"/>`;
  let g = `<circle class="glow" r="${R+12}"/><circle class="halo" r="${R+7}"/>`+shp(`med ${c}`)+`<text class="mono ${c}">${esc(initials(it.t))}</text>`;
  if(it.img){
    g += `<image href="${esc(it.img)}" x="${-R-2}" y="${-R-2}" width="${2*R+4}" height="${2*R+4}" preserveAspectRatio="${parAspect(it.imgPosition)}" clip-path="url(#tree-clip-${c})"/>`+shp(`ring ${c}`);
  }
  return g;
}
function glyphMini(s, ghost){
  const c = sexCls(s), st = ghost ? 'stroke-dasharray="2 2"' : '';
  const inner = s==='M'
    ? `<rect class="med ${c}" x="1.5" y="1.5" width="11" height="11" rx="3.5" style="stroke-width:1.4" ${st}/>`
    : `<circle class="med ${c}" cx="7" cy="7" r="5.6" style="stroke-width:1.4" ${st}/>`;
  return `<svg width="14" height="14" viewBox="0 0 14 14" style="flex:none">${inner}</svg>`;
}
function fmtShort(y){ return y<0 ? `${-y} av.` : `${y}`; }
function shortYears(it){
  const b = startYear(it), e = endYear(it);
  if(e==null) return fmtShort(b);
  if(b<0 && e<0) return `${-b}–${-e} av.`;
  return `${fmtShort(b)}–${fmtShort(e)}`;
}
function nodeSVG(n){
  const it = byId[n.pid], nm = it.t.length>15 ? it.t.slice(0,14)+'…' : it.t;
  return `<g class="node${it.img?' has-img':''}" data-pid="${esc(n.pid)}"><title>${esc(it.t)}</title>${medallion(n.pid)}
    <text class="lbl" y="${R+17}">${esc(nm)}</text><text class="yrs" y="${R+30}">${esc(shortYears(it))}</text></g>`;
}
// construit tous les liens ; chaque lien connaît les personnes qu'il relie (pour la mise en évidence)
function buildLinks(L){
  const N = L.nodes, links = [];
  const add = (ids, html) => links.push({ids, html});
  const line = (d, cls='') => `<path class="lk ${cls}" d="${d}"/>`;
  const dbl = d => `<path class="lk-dbl-o" d="${d}"/><path class="lk-dbl-i" d="${d}"/>`;
  const famDrop = {};   // famille → point de départ des enfants
  const arcCount = {};  // nombre d'arcs déjà partis d'une personne
  const late = [];      // éléments à dessiner par-dessus les lignes simples
  FAMS.forEach(f=>{
    const ps = f.partenaires.filter(p=>N[p]);
    if(ps.length===2){
      let [a,b] = ps.map(p=>N[p]); if(a.X>b.X) [a,b] = [b,a];
      const kin = kinship(a.pid, b.pid), draw = d => kin ? dbl(d) : line(d,'lk-union');
      const unit = a.unitHost===b.unitHost;
      if(a.Y===b.Y && unit){
        // UNE SEULE LIGNE : le mari et toutes ses épouses sont reliés par un même trait horizontal
        // (il passe derrière les médaillons). Le nœud ● juste avant chaque épouse marque son union :
        // c'est de là que partent ses enfants.
        const ms = L.members[a.unitHost], many = ms.length>2;
        const kx = many ? b.X-R-12 : (a.X+b.X)/2;
        const knot = `<circle class="knot" cx="${kx}" cy="${a.Y}" r="${f.enfants.length?4:3}"/>`;
        if(many){
          // ligne simple jusqu'à l'épouse ; double trait (union entre parents) seulement sur son dernier tronçon,
          // dessiné après toutes les lignes simples pour rester visible
          const prev = N[ms[ms.indexOf(b.pid)-1]] || a;
          add([a.pid,b.pid], line(`M${a.X+R+2} ${a.Y} H${b.X-R-2}`,'lk-union'));
          late.push({ids:[a.pid,b.pid], html:(kin ? dbl(`M${prev.X+R+2} ${a.Y} H${b.X-R-2}`) : '')+knot});
        } else add([a.pid,b.pid], draw(`M${a.X+R+2} ${a.Y} H${b.X-R-2}`)+knot);
        famDrop[f.id] = {x:kx, y:a.Y};
      } else if(a.Y===b.Y){
        const host = N[L.unitHost[a.pid]]===a ? a : b;
        const k = (arcCount[host.pid] = (arcCount[host.pid] || 0)+1);
        const yk = a.Y-R-14-(k-1)*7;
        add([a.pid,b.pid], draw(rpath([[a.X,a.Y-R-2],[a.X,yk],[b.X,yk],[b.X,b.Y-R-2]],12)));
        famDrop[f.id] = null;
      } else {
        // union entre deux générations différentes : courbe pointillée légère
        const [u,v] = a.Y<b.Y ? [a,b] : [b,a];
        add([a.pid,b.pid], `<path class="lk lk-cross" d="M${u.X} ${u.Y+R+34} C${u.X} ${(u.Y+v.Y)/2+30}, ${v.X} ${(u.Y+v.Y)/2-30}, ${v.X} ${v.Y-R-2}"/>`);
        famDrop[f.id] = null;
      }
    }
  });
  links.push(...late);
  // enfants
  const famIdx = {}, stagIdx = {};
  FAMS.forEach(f=>{
    const ks = f.enfants.filter(c=>N[c]); if(!ks.length) return;
    const host = N[L.famHost(f)]; if(!host) return;
    let dx, dy;
    if(famDrop[f.id]){ dx = famDrop[f.id].x; dy = famDrop[f.id].y; }
    else {
      const i = (famIdx[host.pid] = (famIdx[host.pid] || 0)+1)-1;
      const n = FAMS.filter(x=>x.enfants.length && L.famHost(x)===host.pid && !famDrop[x.id]).length;
      dx = host.X+(i-(n-1)/2)*10; dy = host.Y+R+36;
    }
    const st = (stagIdx[host.pid] = (stagIdx[host.pid]===undefined ? -1 : stagIdx[host.pid])+1);
    const topY = Math.min(...ks.map(c=>N[c].Y)), barY = topY-R-26-(st%4)*7;
    const pids = f.partenaires.filter(p=>N[p]);
    // jumeaux : un point de fourche commun
    const done = new Set();
    ks.forEach(c=>{
      if(done.has(c)) return;
      const tw = twinOf[c];
      const grp = tw ? ks.filter(k=>twinOf[k] && twinOf[k].groupe===tw.groupe) : [c];
      grp.forEach(k=>done.add(k));
      if(grp.length>1){
        const fx = grp.reduce((s,k)=>s+N[k].X,0)/grp.length;
        grp.forEach(k=>add([...pids,k], line(rpath([[dx,dy],[dx,barY],[fx,barY]],11))+line(`M${fx} ${barY} L${N[k].X} ${N[k].Y-R-2}`)));
        if(tw.type==='monozygote'){
          const xs = grp.map(k=>(fx+N[k].X)/2), yy = (barY+N[grp[0]].Y-R)/2;
          add([...pids,...grp], line(`M${Math.min(...xs)} ${yy} H${Math.max(...xs)}`));
        }
      } else {
        const ch = N[c];
        add([...pids,c], line(rpath([[dx,dy],[dx,barY],[ch.X,barY],[ch.X,ch.Y-R-2]],12)));
      }
    });
  });
  return links;
}

/* ============================================================================
   7. FENÊTRE DE L'ARBRE — affichage, mise en évidence, caméra
   ----------------------------------------------------------------------------
   La fenêtre est dans index.html (#tree-overlay). Rien n'y est dessiné à la main :
   renderTree() redessine tout à partir de l'index (placement + liens).
   Un clic sur un personnage met sa famille en évidence (le reste s'estompe), la
   caméra zoome dessus et le volet de détail s'ouvre. Un clic dans le vide ferme le volet.
============================================================================ */
const VOLET_W = 350;             // largeur du volet latéral (CSS : #tree-volet)
const VOLET_W_SHORT = 300;       // idem sur un téléphone en paysage (CSS : .tree-short #tree-volet)
const NARROW_W = 760;            // en dessous, la fenêtre passe en « étroit » : le volet devient un tiroir en bas
const SHORT_H = 480;             // en dessous (et plus large que haut), on est sur un téléphone en paysage : le volet reste sur le côté
const $ = id => document.getElementById(id);
const tstate = {selected:null, wide:false, cats:new Set()};   // cats : catégories choisies dans le filtre (en mémoire, le temps de la session)
let FSET = null;                 // identifiants des personnes que le filtre met en avant (null = pas de filtre)
const cam = {x:0, y:0, k:1};
let D = null;                    // éléments de la page, pris une fois dans init()
let inited = false, OPEN = false;
let quiet = 0;                   // > 0 : l'arbre ne se redessine pas (écritures groupées en cours)
let LAYOUT = null, LINKS = [], lastPos = {};

// identifiants du formulaire d'ajout (préfixe « taf- » : le formulaire de l'application a les siens)
const AF_IDS = {overlay:'taf-overlay', title:'taf-title', note:'taf-note', err:'taf-error', name:'taf-name', birth:'taf-birth',
  approx:'taf-approx', death:'taf-death', photo:'taf-photo', file:'taf-file', prev:'taf-prev', desc:'taf-desc', gnote:'taf-gnote',
  refs:'taf-refs', father:'taf-father', mother:'taf-mother', spouse:'taf-spouse', child:'taf-child',
  save:'taf-save', cancel:'taf-cancel', close:'taf-close'};
function grab(){
  const af = {};
  Object.keys(AF_IDS).forEach(k=>{ af[k] = $(AF_IDS[k]); });
  D = {
    overlay:$('tree-overlay'), card:$('tree-card'), svg:$('tree'), vp:$('tree-viewport'),
    gLinks:$('tree-links'), gNodes:$('tree-nodes'), empty:$('tree-empty'), emptyText:$('tree-empty-text'),
    volet:$('tree-volet'), voletBody:$('tree-volet-body'), voletClose:$('tree-volet-close'),
    search:$('tree-search'), searchRes:$('tree-search-res'), wide:$('tree-wide'),
    legend:$('tree-legend'), info:$('tree-info-btn'), closeBtn:$('tree-close'), addBtn:$('tree-add'),
    overview:$('tree-overview'), zin:$('tree-zin'), zout:$('tree-zout'), zfit:$('tree-zfit'),
    af, flt:null
  };
  // Le filtre est facultatif : une page plus ancienne (en cache) sans ses éléments garde un arbre qui fonctionne
  const flt = {wrap:$('tree-filter-wrap'), btn:$('tree-filter-btn'), count:$('tree-filter-count'), pop:$('tree-filter-pop'),
    list:$('tree-filter-list'), reset:$('tree-filter-reset'), pill:$('tree-filter-pill'), pillDots:$('tree-filter-pill-dots'),
    pillText:$('tree-filter-pill-text'), pillX:$('tree-filter-pill-x')};
  if(Object.keys(flt).every(k=>flt[k])) D.flt = flt;
  return Object.keys(D).every(k=>k==='af' || k==='flt' || D[k]) && Object.keys(af).every(k=>af[k]);
}

/* ---------- Dessin ---------- */
function renderTree(){
  if(!api || !D) return;
  ensureIndex();
  const L = computeLayout(); LAYOUT = L;
  const ns = Object.values(L.nodes);
  D.empty.classList.toggle('show', !ns.length);
  LINKS = buildLinks(L);
  D.gLinks.innerHTML = LINKS.map((l,i)=>`<g class="lnk" data-i="${i}">${l.html}</g>`).join('');
  D.gNodes.innerHTML = ns.map(nodeSVG).join('');
  // les médaillons glissent de leur ancienne place vers la nouvelle ; un nouveau venu apparaît en grossissant
  const els = [...D.gNodes.children];
  els.forEach(el=>{
    const n = L.nodes[el.dataset.pid], p = lastPos[n.pid];
    if(p) el.style.transform = `translate(${p.x}px,${p.y}px)`;
    else { el.style.transform = `translate(${n.X}px,${n.Y}px) scale(.6)`; el.style.opacity = 0; }
  });
  void D.gNodes.getBoundingClientRect();
  requestAnimationFrame(()=>els.forEach(el=>{
    const n = L.nodes[el.dataset.pid]; if(!n) return;
    el.style.transform = `translate(${n.X}px,${n.Y}px)`; el.style.opacity = '';
  }));
  lastPos = {}; ns.forEach(n=>{ lastPos[n.pid] = {x:n.X, y:n.Y}; });
  applyHighlight();
}

// la famille mise en évidence : parents, frères et sœurs, conjoints, enfants (+ grands-parents et petits-enfants si « élargie »)
function familySet(pid){
  const S = new Set([pid]), f = orig(pid);
  if(f){
    f.partenaires.forEach(p=>S.add(p)); f.enfants.forEach(c=>S.add(c));
    f.partenaires.forEach(p=>fams(p).forEach(x=>x.enfants.forEach(c=>S.add(c))));
  }
  fams(pid).forEach(u=>{ u.partenaires.forEach(p=>S.add(p)); u.enfants.forEach(c=>S.add(c)); });
  if(tstate.wide){
    parentsOf(pid).forEach(p=>parentsOf(p).forEach(g=>S.add(g)));
    allKids(pid).forEach(k=>allKids(k).forEach(g=>S.add(g)));
  }
  return S;
}
/* ---------- Filtre par catégorie ----------
   Choisir une ou plusieurs catégories met en avant leurs personnages (ceux qui portent l'une ou l'autre) ; les autres
   restent dessinés mais très estompés, exactement comme quand on choisit une famille. Quand une personne est choisie,
   sa famille l'emporte, et les personnages du filtre qui n'en font pas partie restent à mi-intensité (classe « flt »). */
// Catégories proposées : celles que portent les personnages de l'arbre (hors « Personnage », que tous portent),
// dans l'ordre où l'application les présente ; n = nombre de personnages concernés
// (une application plus ancienne que ce fichier ne fournit pas la liste des catégories : le filtre n'a alors rien à proposer)
const allCats = () => typeof api.categories === 'function' ? api.categories() : [];
function filterChoices(){
  ensureIndex();
  const count = Object.create(null);
  PEOPLE.forEach(p=>api.catsOf(p).forEach(c=>{ count[c.key] = (count[c.key] || 0)+1; }));
  return allCats().filter(c=>c.key!==PERSON_CAT && !c.locked && count[c.key]).map(c=>Object.assign({n:count[c.key]}, c));
}
// Personnes mises en avant par le filtre, ou null s'il n'y a pas de filtre. Une catégorie choisie que plus personne
// ne porte (supprimée, retirée à la main) est oubliée au passage.
function computeFilter(){
  if(!tstate.cats.size) return null;
  ensureIndex();
  const S = new Set(), live = new Set();
  PEOPLE.forEach(p=>{
    const ks = api.catsOf(p).map(c=>c.key).filter(k=>tstate.cats.has(k));
    if(ks.length){ S.add(p.id); ks.forEach(k=>live.add(k)); }
  });
  [...tstate.cats].forEach(k=>{ if(!live.has(k)) tstate.cats.delete(k); });
  return tstate.cats.size ? S : null;
}
function renderFilterList(){
  const f = D.flt; if(!f) return;
  const ch = filterChoices();
  f.list.innerHTML = ch.length
    ? ch.map(c=>`<button type="button" class="tf-chip${tstate.cats.has(c.key) ? ' on' : ''}" data-k="${esc(c.key)}" aria-pressed="${tstate.cats.has(c.key)}">`
        + `<span class="dot" style="background:${esc(c.color)}"></span><span class="tf-name">${esc(c.label)}</span><span class="tf-n">${c.n}</span></button>`).join('')
    : `<div class="tf-none">${esc(t('filterNone'))}</div>`;
  f.reset.disabled = !tstate.cats.size;
}
// Bouton « Filtre » (actif + nombre de catégories), pastille rappelant le filtre en cours, liste ouverte
function syncFilterUI(F){
  const f = D.flt; if(!f) return;
  const n = tstate.cats.size, on = n>0 && !!F;
  f.btn.classList.toggle('active', n>0);
  f.count.textContent = n ? `(${n})` : '';
  f.pill.classList.toggle('show', on);
  if(on){
    const cats = allCats().filter(c=>tstate.cats.has(c.key));
    f.pillDots.innerHTML = cats.map(c=>`<span class="dot" style="background:${esc(c.color)}"></span>`).join('');
    const txt = cats.map(c=>c.label).join(' + ')+' · '+F.size;
    f.pillText.textContent = txt; f.pill.title = txt;
  }
  if(f.pop.classList.contains('open')) renderFilterList();
}
function toggleFilterPop(open){
  const f = D.flt; if(!f) return;
  const o = open===undefined ? !f.pop.classList.contains('open') : open;
  if(o){ toggleLegend(false); D.searchRes.classList.remove('show'); renderFilterList(); }
  f.pop.classList.toggle('open', o);
  f.btn.setAttribute('aria-expanded', String(o));
  if(o) positionFilterPop();
}
// La liste s'ouvre sous le bouton sans jamais dépasser de la fenêtre (téléphone : le bouton peut être à droite)
function positionFilterPop(){
  const f = D.flt, card = D.card.getBoundingClientRect(), wrap = f.wrap.getBoundingClientRect();
  f.pop.style.left = '0px';
  const w = f.pop.offsetWidth;
  const left = Math.max(card.left+8, Math.min(wrap.left, card.right-8-w));
  f.pop.style.left = (left-wrap.left)+'px';
}
// Un changement de filtre ferme la fiche ouverte (sinon la famille choisie l'emporterait et le filtre ne se verrait pas),
// puis la vue se cadre sur les personnes mises en avant
function afterFilterChange(){
  clearSelection();
  if(FSET) fitFilter(true);
}
function toggleFilterCat(key){
  if(tstate.cats.has(key)) tstate.cats.delete(key); else tstate.cats.add(key);
  afterFilterChange();
}
function clearFilter(){
  tstate.cats.clear();
  afterFilterChange();
}
function fitFilter(anim){
  if(!LAYOUT || !FSET) return;
  fitBox([...FSET].map(id=>LAYOUT.nodes[id]).filter(Boolean), anim);
}

function applyHighlight(){
  let sel = tstate.selected;
  if(sel && !(LAYOUT && LAYOUT.nodes[sel])){ sel = tstate.selected = null; D.volet.classList.remove('open'); }
  const F = FSET = computeFilter();
  const S = sel ? familySet(sel) : F;                 // la famille d'une personne choisie l'emporte sur le filtre
  D.svg.classList.toggle('focus-mode', !!S);
  D.gNodes.querySelectorAll('.node').forEach(el=>{
    const id = el.dataset.pid;
    el.classList.toggle('fam', !!S && S.has(id));
    el.classList.toggle('sel', id===sel);
    el.classList.toggle('flt', !!F && F.has(id));
  });
  D.gLinks.querySelectorAll('.lnk').forEach(el=>{
    const l = LINKS[+el.dataset.i];
    el.classList.toggle('fam', !!S && !!l && l.ids.every(i=>S.has(i)));
    el.classList.toggle('flt', !!F && !!l && l.ids.every(i=>F.has(i)));
  });
  // la famille (ou les personnes du filtre) passe au premier plan
  if(S) D.gNodes.querySelectorAll('.node.fam').forEach(el=>D.gNodes.appendChild(el));
  syncFilterUI(F);
}

/* ---------- Caméra : déplacement, zoom molette / pincement, inertie ---------- */
let lodState = '', camRaf = 0;
function applyCam(anim){
  if(anim) D.vp.classList.add('anim'); else if(D.vp.classList.contains('anim')) D.vp.classList.remove('anim');
  D.vp.style.transform = `translate(${cam.x}px,${cam.y}px) scale(${cam.k})`;
  if(anim) setTimeout(()=>D.vp.classList.remove('anim'), 650);
  // niveau de détail : très dézoomé, on retire les dates puis les noms (sauf ceux de la famille choisie)
  const lod = cam.k<0.32 ? '2' : cam.k<0.5 ? '1' : '0';
  if(lod!==lodState){ lodState = lod; D.svg.classList.toggle('lod1', lod!=='0'); D.svg.classList.toggle('lod2', lod==='2'); }
}
function scheduleCam(){ if(camRaf) return; camRaf = requestAnimationFrame(()=>{ camRaf = 0; applyCam(false); }); }
// zone réellement visible : le volet en recouvre une partie
function treeViewport(){
  const r = D.svg.getBoundingClientRect(), vo = D.volet.classList.contains('open'), narrow = D.overlay.classList.contains('tree-narrow');
  const vw = D.overlay.classList.contains('tree-short') ? VOLET_W_SHORT : VOLET_W;
  return {w:r.width-(vo && !narrow ? vw : 0), h:vo && narrow ? r.height*0.36 : r.height, ok:r.width>20 && r.height>20};
}
function fitBox(pts, anim, maxK=1.15){
  if(!pts.length) return;
  stopInertia();
  const v = treeViewport(); if(!v.ok) return;
  const xs = pts.map(p=>p.X), ys = pts.map(p=>p.Y);
  const x0 = Math.min(...xs)-SLOT*0.7, x1 = Math.max(...xs)+SLOT*0.7, y0 = Math.min(...ys)-R-50, y1 = Math.max(...ys)+R+50;
  const k = Math.min(maxK, Math.max(0.12, Math.min((v.w-30)/(x1-x0), (v.h-60)/(y1-y0))));
  cam.k = k; cam.x = v.w/2-k*(x0+x1)/2; cam.y = v.h/2-k*(y0+y1)/2+8;
  applyCam(anim);
}
// all = false : l'arbre relié seulement (les personnages sans lien, rangés à droite, ne rétrécissent pas la vue)
function fitTree(anim, all){
  if(!LAYOUT) return;
  const ns = Object.values(LAYOUT.nodes), main = ns.filter(n=>!n.alone);
  fitBox(!all && main.length ? main : ns, anim);
}
function zoomToFamily(pid, anim){
  if(!LAYOUT) return;
  fitBox([...familySet(pid)].map(p=>LAYOUT.nodes[p]).filter(Boolean), anim);
}
function zoomAt(f, sx, sy){
  const k = Math.min(2.5, Math.max(0.12, cam.k*f)), r = k/cam.k;
  cam.x = sx-(sx-cam.x)*r; cam.y = sy-(sy-cam.y)*r; cam.k = k; scheduleCam();
}
const ptrs = new Map();
let drag = null, pinch = null, inertia = 0, samples = [];
function stopInertia(){ if(inertia){ cancelAnimationFrame(inertia); inertia = 0; } }
function startDrag(x, y){ drag = {sx:x, sy:y, cx:cam.x, cy:cam.y, moved:false}; samples = [{t:performance.now(), x, y}]; }
function wireCamera(){
  const svg = D.svg;
  svg.addEventListener('wheel', e=>{
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY*0.0015), e.clientX-r.left, e.clientY-r.top);
  }, {passive:false});
  svg.addEventListener('pointerdown', e=>{
    stopInertia(); toggleLegend(false);
    try{ svg.setPointerCapture(e.pointerId); }catch(err){ /* pointeur déjà relâché */ }
    ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if(ptrs.size===1) startDrag(e.clientX, e.clientY);
    if(ptrs.size===2){ const [a,b] = [...ptrs.values()]; pinch = {d:Math.hypot(a.x-b.x, a.y-b.y), k:cam.k}; drag = null; }
  });
  svg.addEventListener('pointermove', e=>{
    if(!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if(pinch && ptrs.size===2){
      const [a,b] = [...ptrs.values()], r = svg.getBoundingClientRect();
      zoomAt((pinch.k*Math.hypot(a.x-b.x, a.y-b.y)/pinch.d)/cam.k, (a.x+b.x)/2-r.left, (a.y+b.y)/2-r.top);
      return;
    }
    if(drag){
      const dx = e.clientX-drag.sx, dy = e.clientY-drag.sy;
      if(!drag.moved && Math.hypot(dx,dy)>4){ drag.moved = true; svg.classList.add('dragging'); }
      if(drag.moved){
        cam.x = drag.cx+dx; cam.y = drag.cy+dy; scheduleCam();
        const t0 = performance.now(); samples.push({t:t0, x:e.clientX, y:e.clientY});
        while(samples.length>2 && t0-samples[0].t>90) samples.shift();
      }
    }
  });
  const endPtr = e=>{
    ptrs.delete(e.pointerId);
    if(pinch && ptrs.size===1){ pinch = null; const [q] = [...ptrs.values()]; startDrag(q.x, q.y); drag.moved = true; return; }
    if(ptrs.size<2) pinch = null;
    if(drag && !drag.moved && e.type==='pointerup'){
      // simple clic : le pointeur est capturé par le dessin, on retrouve le médaillon visé à la main
      const el = document.elementFromPoint(e.clientX, e.clientY), nd = el && el.closest && el.closest('.node[data-pid]');
      if(nd) selectPerson(nd.dataset.pid); else if(tstate.selected) clearSelection();
    } else if(drag && drag.moved && samples.length>1){
      // inertie : la vue continue de glisser puis ralentit
      const a = samples[0], b = samples[samples.length-1], dt = Math.max(16, b.t-a.t);
      let vx = (b.x-a.x)/dt, vy = (b.y-a.y)/dt, last = performance.now();
      if(Math.hypot(vx,vy)>0.25){
        const step = tt=>{
          const d = tt-last; last = tt; cam.x += vx*d; cam.y += vy*d;
          const f = Math.pow(0.994, d); vx *= f; vy *= f; applyCam(false);
          inertia = Math.hypot(vx,vy)>0.02 ? requestAnimationFrame(step) : 0;
        };
        inertia = requestAnimationFrame(step);
      }
    }
    if(!ptrs.size){ drag = null; svg.classList.remove('dragging'); }
  };
  svg.addEventListener('pointerup', endPtr);
  svg.addEventListener('pointercancel', endPtr);
  // une photo qui se charge masque l'initiale en dessous ; une photo introuvable disparaît (l'initiale reste)
  svg.addEventListener('load', e=>{
    const el = e.target;
    if(el && el.tagName && el.tagName.toLowerCase()==='image' && el.parentNode) el.parentNode.classList.add('loaded');
  }, true);
  svg.addEventListener('error', e=>{
    const el = e.target;
    if(!(el && el.tagName && el.tagName.toLowerCase()==='image') || !el.parentNode) return;
    const ring = el.nextElementSibling;
    if(ring && ring.classList.contains('ring')) ring.remove();
    el.remove();
  }, true);
}

/* ---------- Sélection, ouverture, fermeture ---------- */
function selectPerson(pid){
  if(!byId[pid] || !LAYOUT || !LAYOUT.nodes[pid]) return;
  tstate.selected = pid;
  D.searchRes.classList.remove('show');
  openVolet(pid); applyHighlight(); zoomToFamily(pid, true);
}
function clearSelection(){
  tstate.selected = null; D.volet.classList.remove('open'); applyHighlight();
}
function computeNarrow(){
  const w = D.overlay.clientWidth, h = D.overlay.clientHeight;
  const short = h<=SHORT_H && w>h;                                       // téléphone en paysage : peu de hauteur, beaucoup de largeur
  D.overlay.classList.toggle('tree-short', short);
  D.overlay.classList.toggle('tree-narrow', w<=NARROW_W && !(short && w>=520));   // tiroir en bas, sauf en paysage assez large
}
const SEEN_KEY = 'bibline-arbre-vu';
function markSeen(){
  const dot = document.querySelector('#rail-tree .new-dot');
  if(dot) dot.remove();
  try{ localStorage.setItem(SEEN_KEY, '1'); }catch(err){ /* stockage indisponible : le point reviendra, sans conséquence */ }
}
function openTree(pid){
  if(!inited || !api) return;
  OPEN = true;
  D.overlay.classList.add('open');
  computeNarrow();
  lastPos = {};
  renderTree();
  const want = (pid && byId[pid]) ? pid : (tstate.selected && byId[tstate.selected] ? tstate.selected : null);
  requestAnimationFrame(()=>{
    if(!OPEN) return;
    if(want && LAYOUT.nodes[want]) selectPerson(want);
    else { clearSelection(); if(FSET) fitFilter(false); else fitTree(false, false); }   // un filtre resté actif : on rouvre sur ses personnes
  });
  markSeen();
}
function closeTree(){
  if(!inited) return;
  OPEN = false;
  stopInertia();
  D.overlay.classList.remove('open');
  D.af.overlay.classList.remove('open');
  D.searchRes.classList.remove('show');
  toggleLegend(false);
  toggleFilterPop(false);
}
function toggleLegend(open){
  const o = open===undefined ? !D.legend.classList.contains('open') : open;
  D.legend.classList.toggle('open', o); D.info.classList.toggle('active', o);
}
// « Aller voir sur la frise » : la fenêtre se ferme, la frise se centre sur le personnage
function gotoTimeline(pid){
  const it = byId[pid]; if(!it) return;
  closeTree();
  api.goToItem(it);
}

/* ============================================================================
   8. VOLET DU PERSONNAGE, FICHE GÉNÉALOGIQUE, RECHERCHE
   ----------------------------------------------------------------------------
   Le volet recouvre le côté de l'arbre. Il montre ce que dit la frise (photo,
   dates, description, références) puis ce que dit la base généalogique (note,
   famille). Seul le bouton « Aller voir sur la frise » quitte l'arbre.
============================================================================ */
const ICON_GOTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"/><circle cx="8" cy="12" r="2.2" fill="currentColor"/><line x1="15" y1="8" x2="15" y2="16"/></svg>';
const ICON_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

function catBadges(it){
  return api.catsOf(it).map(c=>
    `<span class="cat-badge" style="color:${esc(c.color)};border:1px solid ${esc(c.color)}55;background:${esc(c.color)}15">${esc(c.label)}</span>`).join('');
}
// pastille cliquable d'une personne ; sans identifiant : « inconnu(e) », en pointillés
function pchip(id, sub, gs){
  if(!id || !byId[id]) return `<span class="pchip unknown">${glyphMini(gs,true)} ${esc(t(gs==='F' ? 'unknownF' : 'unknownM'))}</span>`;
  return `<button type="button" class="pchip" data-go="${esc(id)}">${glyphMini(sexOf(id))}${esc(byId[id].t)}${sub ? ` <span class="sub">${esc(sub)}</span>` : ''}</button>`;
}
const relRow = (k, h) => h ? `<div class="rel-row"><div class="rel-key">${esc(k)}</div><div class="rel-vals">${h}</div></div>` : '';

function relationsHTML(pid){
  const s = sexOf(pid), f = orig(pid);
  let rel = '';
  if(f){
    const ps = f.partenaires;
    const pere = ps.find(p=>sexOf(p)==='M'), mere = ps.find(p=>sexOf(p)==='F');
    const unk = ps.filter(p=>p!==pere && p!==mere);        // parent dont le sexe n'est pas renseigné
    if(pere || !unk.length) rel += relRow(t('father'), pchip(pere || null, '', 'M'));
    if(mere || !unk.length) rel += relRow(t('mother'), pchip(mere || null, '', 'F'));
    if(unk.length) rel += relRow(t('parents'), unk.map(p=>pchip(p)).join(''));
    const tw = twinOf[pid];
    rel += relRow(t('siblings'), f.enfants.filter(k=>k!==pid)
      .map(k=>pchip(k, tw && twinOf[k] && twinOf[k].groupe===tw.groupe ? t('twin') : '')).join(''));
    const half = new Map();
    ps.forEach(p=>fams(p).forEach(of=>{
      if(of===f) return;
      of.enfants.forEach(k=>{ if(k!==pid && !half.has(k)) half.set(k, W(sexOf(p), t('byFather'), t('byMother'), t('byParent'))); });
    }));
    rel += relRow(t('halfSiblings'), [...half].map(([k,sub])=>pchip(k, sub)).join(''));
  }
  fams(pid).forEach(u=>{
    const p = other(u, pid);
    rel += relRow(W(s, t('wife'), t('husband'), t('spouse')), pchip(p, '', opp(s)));
    if(p){
      const k = kinship(pid, p);
      if(k) rel += `<div class="consang-note"><b>${esc(t('kinTitle'))}</b> : ${esc(k.label)} — ${esc(t('kinCommon'))} : ${k.commons.map(c=>esc(nameOf(c))).join(', ')}.</div>`;
    }
    rel += relRow(t('children'), u.enfants.map(k=>pchip(k, W(sexOf(k), t('son'), t('daughter'), t('childN')))).join(''));
  });
  return rel;
}
function ficheHTML(fiche){
  if(!fiche) return '';
  return `<div class="sec-head"><span class="panel-label">${esc(t('noteTitle'))}</span><button type="button" class="link-btn" data-act="edit-fiche">${esc(t('modify'))}</button></div>`
    + ((fiche.note || fiche.refs)
      ? '<div class="note-box"><div class="note-view" id="tree-v-gnote"></div><div class="bible-refs" id="tree-v-grefs"></div></div>'
      : `<div class="acc-hint">${esc(t('noNote'))}</div>`);
}

function openVolet(pid){
  const it = byId[pid]; if(!it) return;
  const s = sexOf(pid), fiche = state.fiches[pid] || null, rel = relationsHTML(pid);
  let h = '';
  if(it.img) h += `<div class="v-img"><img src="${esc(it.img)}" alt="" referrerpolicy="no-referrer" style="object-position:${esc(it.imgPosition || 'center center')}"></div>`;
  h += `<div class="v-cats">${catBadges(it)}</div>`;
  h += `<h3>${glyphMini(s)}<span>${esc(it.t)}</span></h3><div class="date">${esc(api.dateLabel(it))}</div>`;
  if(!fiche) h += `<div class="warn-note">${esc(t('noFiche'))} <button type="button" class="link-btn" data-act="fill">${esc(t('fill'))}</button></div>`;
  h += '<div class="note-view v-desc" id="tree-v-desc"></div><div class="bible-refs v-refs" id="tree-v-refs"></div>';
  h += `<div class="btn-row v-actions">
      <button type="button" class="btn-primary" data-act="goto">${ICON_GOTO}<span>${esc(t('goTimeline'))}</span></button>
      <button type="button" class="btn-secondary" data-act="edit-item">${ICON_EDIT}<span>${esc(t('editItem'))}</span></button>
    </div>`;
  h += `<div class="v-section" id="tree-fiche-sec">${ficheHTML(fiche)}</div>`;
  h += `<div class="v-section"><div class="panel-label">${esc(t('family'))}</div>${rel || `<div class="acc-hint">${esc(t('noLinks'))}</div>`}
      <div class="panel-label" style="margin:12px 0 6px">${esc(t('addLabel'))}</div>
      <div class="quick-add">
        ${parentsOf(pid).length<2 ? `<button type="button" data-add="parent">${esc(t('addParent'))}</button>` : ''}
        <button type="button" data-add="spouse">+ ${esc(W(s, t('wife'), t('husband'), t('spouse')))}</button>
        <button type="button" data-add="child">${esc(t('addChild'))}</button>
      </div></div>`;
  D.voletBody.innerHTML = h;
  api.renderNote($('tree-v-desc'), it.d);
  api.renderBibleRefs($('tree-v-refs'), it.bibleRefs, false);
  const gn = $('tree-v-gnote');
  if(gn && fiche){ api.renderNote(gn, fiche.note); api.renderBibleRefs($('tree-v-grefs'), fiche.refs, false); }
  D.volet.classList.add('open'); D.volet.scrollTop = 0;
}

/* ---------- Fiche généalogique : modification sur place (sexe, note, références) ---------- */
function editFiche(pid){
  const sec = $('tree-fiche-sec'); if(!sec) return;
  const f = state.fiches[pid] || {sexe:null};
  sec.dataset.sx = f.sexe || '';
  sec.innerHTML = `<div class="sec-head"><span class="panel-label">${esc(t('ficheTitle'))}</span></div>
    <div class="form-row"><label>${esc(t('sexLabel'))}</label><div class="segmented" id="tree-ef-sexe">${['M','F',''].map(v=>
      `<button type="button" class="seg-btn${(f.sexe||'')===v ? ' active' : ''}" data-v="${v}">${esc(v==='M' ? t('male') : v==='F' ? t('female') : t('unknownSex'))}</button>`).join('')}</div></div>
    <div class="form-row"><label>${esc(t('noteLabel'))}</label><textarea id="tree-ef-note" rows="3">${esc(f.note || '')}</textarea></div>
    <div class="form-row"><label>${esc(t('refsLabel'))}</label><input type="text" id="tree-ef-refs" value="${esc(f.refs || '')}" placeholder="${esc(t('refsPh'))}" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
    <div class="btn-row end"><button type="button" class="btn-secondary" data-act="ef-cancel">${esc(t('cancel'))}</button><button type="button" class="btn-primary" data-act="ef-save">${esc(t('save'))}</button></div>`;
  sec.scrollIntoView({block:'nearest'});
}
function saveFiche(){
  const pid = tstate.selected, sec = $('tree-fiche-sec');
  if(!pid || !sec || !byId[pid]) return;
  const nf = state.fiches[pid] || (state.fiches[pid] = {sexe:null});
  nf.sexe = (sec.dataset.sx==='M' || sec.dataset.sx==='F') ? sec.dataset.sx : null;
  const note = $('tree-ef-note').value.trim(), refs = $('tree-ef-refs').value.trim();
  if(note) nf.note = note; else delete nf.note;
  if(refs) nf.refs = refs; else delete nf.refs;
  changed();
  renderTree();                      // le sexe change le symbole et peut changer le placement
  openVolet(pid); zoomToFamily(pid, true);
  api.toast(t('ficheSaved'));
}

/* ---------- Recherche d'un personnage ---------- */
function runSearch(){
  const q = norm(D.search.value.trim());
  if(!q){ D.searchRes.classList.remove('show'); return; }
  ensureIndex();
  const res = PEOPLE.filter(p=>norm(p.t).includes(q))
    .sort((a,b)=>(norm(b.t).startsWith(q)?1:0)-(norm(a.t).startsWith(q)?1:0) || a.t.localeCompare(b.t, LANG))
    .slice(0, 30);
  D.searchRes.innerHTML = res.map(p=>
    `<div class="res-row" data-go="${esc(p.id)}">${glyphMini(sexOf(p.id))}<span class="rn">${esc(p.t)}</span><span class="d">${esc(shortYears(p))}</span></div>`).join('')
    || `<div class="res-row none">${esc(t('noResult'))}</div>`;
  D.searchRes.classList.add('show');
}

/* ---------- Branchement des commandes de la fenêtre ---------- */
function wireUI(){
  wireCamera();
  // volet : un seul écouteur pour toutes les commandes
  D.volet.addEventListener('click', e=>{
    // un renvoi #Titre dans une note : si c'est un personnage de l'arbre on y reste, sinon on laisse l'application ouvrir la frise
    const ne = e.target.closest('.note-event');
    if(ne){
      const id = ne.dataset.eventId;
      if(id && byId[id] && LAYOUT && LAYOUT.nodes[id]){ e.preventDefault(); e.stopPropagation(); selectPerson(id); }
      else closeTree();
      return;
    }
    const go = e.target.closest('[data-go]'); if(go){ selectPerson(go.dataset.go); return; }
    const add = e.target.closest('[data-add]'); if(add){ openAddForm(add.dataset.add, tstate.selected); return; }
    const sb = e.target.closest('#tree-ef-sexe .seg-btn');
    if(sb){
      const sec = $('tree-fiche-sec'); if(sec) sec.dataset.sx = sb.dataset.v;
      sb.parentNode.querySelectorAll('.seg-btn').forEach(x=>x.classList.toggle('active', x===sb));
      return;
    }
    const act = e.target.closest('[data-act]'); if(!act) return;
    const pid = tstate.selected;
    switch(act.dataset.act){
      case 'goto':      gotoTimeline(pid); break;
      case 'edit-item': if(byId[pid]) api.editItem(byId[pid]); break;
      case 'edit-fiche':
      case 'fill':      editFiche(pid); break;
      case 'ef-save':   saveFiche(); break;
      case 'ef-cancel': openVolet(pid); break;
    }
  });
  // une photo introuvable disparaît du volet
  D.volet.addEventListener('error', e=>{
    const el = e.target;
    if(el && el.tagName==='IMG' && el.parentNode && el.parentNode.classList.contains('v-img')) el.parentNode.remove();
  }, true);
  D.voletClose.addEventListener('click', clearSelection);
  D.overview.addEventListener('click', ()=>{ clearSelection(); fitTree(true, true); });
  D.zfit.addEventListener('click', ()=>fitTree(true, true));
  D.zin.addEventListener('click', ()=>{ const r = D.svg.getBoundingClientRect(); zoomAt(1.25, r.width/2, r.height/2); });
  D.zout.addEventListener('click', ()=>{ const r = D.svg.getBoundingClientRect(); zoomAt(0.8, r.width/2, r.height/2); });
  D.wide.addEventListener('change', ()=>{
    tstate.wide = D.wide.checked; applyHighlight();
    if(tstate.selected) zoomToFamily(tstate.selected, true);
  });
  D.info.addEventListener('click', e=>{ e.stopPropagation(); toggleLegend(); });
  // filtre par catégorie (facultatif : absent d'une page plus ancienne)
  if(D.flt){
    D.flt.btn.addEventListener('click', e=>{ e.stopPropagation(); toggleFilterPop(); });
    D.flt.list.addEventListener('click', e=>{ const c = e.target.closest('.tf-chip'); if(c) toggleFilterCat(c.dataset.k); });
    D.flt.reset.addEventListener('click', clearFilter);
    D.flt.pillX.addEventListener('click', clearFilter);
    document.addEventListener('pointerdown', e=>{
      if(OPEN && !e.target.closest('#tree-filter-wrap')) toggleFilterPop(false);
    });
  }
  // recherche
  D.search.addEventListener('input', runSearch);
  D.search.addEventListener('focus', runSearch);
  D.search.addEventListener('keydown', e=>{
    if(e.key==='Enter'){ const first = D.searchRes.querySelector('[data-go]'); if(first){ D.search.value = ''; selectPerson(first.dataset.go); D.search.blur(); } }
  });
  D.searchRes.addEventListener('click', e=>{
    const r = e.target.closest('[data-go]');
    if(r){ D.search.value = ''; D.searchRes.classList.remove('show'); selectPerson(r.dataset.go); }
  });
  document.addEventListener('pointerdown', e=>{
    if(OPEN && !e.target.closest('#tree-search-wrap')) D.searchRes.classList.remove('show');
  });
  // fermeture : bouton ✕, clic sur le fond (comme le plan), touche Échap
  D.closeBtn.addEventListener('click', closeTree);
  D.overlay.addEventListener('click', e=>{ if(e.target===D.overlay) closeTree(); });
  D.addBtn.addEventListener('click', ()=>openAddForm('free', null));
  document.addEventListener('keydown', e=>{
    if(e.key!=='Escape' || !OPEN) return;
    if(D.af.overlay.classList.contains('open')){ closeAddForm(); return; }
    if(api.editOpen && api.editOpen()) return;               // la fiche de l'application est ouverte par-dessus : elle garde la main
    if(D.searchRes.classList.contains('show')){ D.searchRes.classList.remove('show'); return; }
    if(D.flt && D.flt.pop.classList.contains('open')){ toggleFilterPop(false); return; }
    if(D.legend.classList.contains('open')){ toggleLegend(false); return; }
    if(tstate.selected){ clearSelection(); return; }
    closeTree();
  });
  window.addEventListener('resize', ()=>{ if(OPEN) computeNarrow(); });
  window.addEventListener('orientationchange', ()=>{ if(OPEN) setTimeout(computeNarrow, 80); });
  wireAddForm();
}

/* ============================================================================
   9. AJOUT D'UN PERSONNAGE DEPUIS L'ARBRE
   ----------------------------------------------------------------------------
   Une seule saisie, deux écritures : l'élément (catégorie « Personnage », date
   de naissance obligatoire) est créé dans la frise par l'application, puis la
   fiche et les liens familiaux sont écrits dans la base généalogique.
   Toutes les vérifications ont lieu AVANT la première écriture : un refus
   n'enregistre rien.
============================================================================ */
const seg = {birthEra:'bc', deathEra:'bc', sexe:'M'};
let fileData = null;

function syncSeg(){
  D.af.overlay.querySelectorAll('[data-seg]').forEach(g=>
    g.querySelectorAll('.seg-btn').forEach(b=>b.classList.toggle('active', b.dataset.v===seg[g.dataset.seg])));
}
function showPrev(src){
  const p = D.af.prev, img = p.querySelector('img');
  if(!src){ p.classList.remove('show'); img.removeAttribute('src'); return; }
  img.src = src; p.classList.add('show');
}
function fillSelect(sel, list, val){
  sel.innerHTML = `<option value="">${esc(t('none'))}</option>`
    + list.map(p=>`<option value="${esc(p.id)}">${esc(p.t)} (${esc(shortYears(p))})</option>`).join('');
  sel.value = val || '';
}
function closeAddForm(){ D.af.overlay.classList.remove('open'); }

// mode : 'free' (depuis le bouton d'en-tête), 'child' / 'spouse' / 'parent' (depuis le volet de la personne ref)
function openAddForm(mode, ref){
  if(!inited) return;
  ensureIndex();
  const A = D.af;
  A.err.classList.remove('show');
  [A.name, A.birth, A.death, A.photo, A.desc, A.gnote, A.refs].forEach(el=>{ el.value = ''; });
  A.file.value = ''; fileData = null; showPrev(null); A.approx.checked = true;
  seg.birthEra = 'bc'; seg.deathEra = 'bc'; seg.sexe = 'M';
  const all = PEOPLE.slice().sort((a,b)=>a.t.localeCompare(b.t, LANG));
  const men = all.filter(p=>sexOf(p.id)!=='F'), women = all.filter(p=>sexOf(p.id)!=='M');
  let fa = '', mo = '', sp = '', ch = '', title = t('addTitle');
  const r = ref && byId[ref] ? byId[ref] : null, rs = r ? sexOf(ref) : null;
  if(r && mode==='child'){
    title = t('addChildOf', r.t);
    if(rs==='F') mo = ref; else fa = ref;
    const sps = fams(ref).map(f=>other(f, ref)).filter(Boolean);
    if(sps[0]){ if(rs==='F') fa = sps[0]; else mo = sps[0]; }
  }
  if(r && mode==='spouse'){ title = t('addSpouseTo', r.t, rs); sp = ref; seg.sexe = opp(rs) || 'M'; }
  if(r && mode==='parent'){
    title = t('addParentOf', r.t); ch = ref;
    const f = orig(ref);
    if(f && f.partenaires.length===1) seg.sexe = opp(sexOf(f.partenaires[0])) || 'M';
  }
  A.title.textContent = title;
  fillSelect(A.father, men, fa); fillSelect(A.mother, women, mo); fillSelect(A.spouse, all, sp); fillSelect(A.child, all, ch);
  syncSeg();
  A.overlay.classList.add('open');
  const body = A.overlay.querySelector('.modal-card'); if(body) body.scrollTop = 0;
  setTimeout(()=>A.name.focus(), 60);
}

function saveAdd(){
  const A = D.af;
  ensureIndex();
  const fail = m => { A.err.textContent = m; A.err.classList.add('show'); A.err.scrollIntoView({block:'nearest'}); };
  const name = A.name.value.trim(), bv = A.birth.value.trim(), dv = A.death.value.trim();
  if(!name) return fail(t('errName'));
  if(!bv) return fail(t('errBirth'));
  if(!/^-?\d{1,6}$/.test(bv)) return fail(t('errBirthFmt'));
  const by = (seg.birthEra==='bc' ? -Math.abs(+bv) : Math.abs(+bv)) + 0;           // « + 0 » écarte un −0
  let dy = null;
  if(dv!==''){
    if(!/^-?\d{1,6}$/.test(dv)) return fail(t('errDeath'));
    dy = (seg.deathEra==='bc' ? -Math.abs(+dv) : Math.abs(+dv)) + 0;
    if(dy<=by) return fail(t('errDeathOrder'));
  }
  const sexe = seg.sexe || null;
  const fa = A.father.value, mo = A.mother.value, sp = A.spouse.value, ch = A.child.value;
  const picked = [fa, mo, sp, ch].filter(Boolean);
  if(new Set(picked).size!==picked.length) return fail(t('errSame'));
  if(ch){
    const f = orig(ch);
    if(f && f.partenaires.length>=2) return fail(t('errTwoParents', nameOf(ch)));
    if(f && f.partenaires.length===1 && sexe && sexOf(f.partenaires[0])===sexe) return fail(t('errParentSex', nameOf(ch), nameOf(f.partenaires[0])));
    // la nouvelle personne serait l'enfant de fa/mo et le parent de ch : ch ne peut donc pas être leur ancêtre
    if([fa, mo].some(p=>p && isAncestor(ch, p))) return fail(t('errCycle', nameOf(ch)));
  }
  // — toutes les vérifications sont passées : on écrit —
  const img = fileData || A.photo.value.trim() || null;
  let item = null, problem = null;
  quiet++;
  try{
    item = api.addPerson({t:name, birth:by, death:dy, approx:A.approx.checked, d:A.desc.value.trim(),
      img, imgPosition: img ? 'center center' : null});
    const id = item.id;
    const fiche = {sexe};
    const nt = A.gnote.value.trim(), rf = A.refs.value.trim();
    if(nt) fiche.note = nt;
    if(rf) fiche.refs = rf;
    state.fiches[id] = fiche;
    const F = state.familles, same = (a,b)=>a.length===b.length && a.every(x=>b.includes(x));
    if(fa || mo){
      const pp = [fa, mo].filter(Boolean);
      let f = F.find(x=>same(x.partenaires, pp));
      if(!f){ f = {id:newFamId(), partenaires:pp, enfants:[]}; F.push(f); }
      f.enfants.push(id);
    }
    if(ch){
      const f = F.find(x=>x.enfants.includes(ch));
      if(f) f.partenaires.push(id); else F.push({id:newFamId(), partenaires:[id], enfants:[ch]});
    }
    if(sp && !F.some(x=>same(x.partenaires, [id, sp]))){
      F.push({id:newFamId(), partenaires: sexe==='F' ? [sp, id] : [id, sp], enfants:[]});
    }
    changed();
    api.commitItems();
  }catch(err){
    problem = err;
  }finally{
    quiet--;
  }
  if(problem){ console.error('Bibline — arbre : ajout impossible', problem); return fail(String(problem && problem.message || problem)); }
  closeAddForm();
  renderTree();
  selectPerson(item.id);
  api.toast(t('added', name, catName()));
}

function wireAddForm(){
  const A = D.af;
  A.overlay.querySelectorAll('[data-seg]').forEach(g=>g.addEventListener('click', e=>{
    const b = e.target.closest('.seg-btn'); if(!b) return;
    seg[g.dataset.seg] = b.dataset.v; syncSeg();
  }));
  A.file.addEventListener('change', ()=>{
    const f = A.file.files && A.file.files[0]; if(!f) return;
    const rd = new FileReader();
    rd.onload = ()=>{ fileData = rd.result; A.photo.value = ''; showPrev(fileData); };
    rd.readAsDataURL(f);
  });
  A.photo.addEventListener('input', ()=>{ fileData = null; showPrev(A.photo.value.trim()); });
  A.prev.querySelector('img').addEventListener('error', ()=>A.prev.classList.remove('show'));
  A.close.addEventListener('click', closeAddForm);
  A.cancel.addEventListener('click', closeAddForm);
  A.save.addEventListener('click', saveAdd);
}

/* ============================================================================
   10. INTERFACE AVEC L'APPLICATION
   ----------------------------------------------------------------------------
   app.js appelle init() avec un objet « api » (liste des éléments, création d'un
   personnage, ouverture de la fiche, date lisible, etc. : voir la section
   « Arbre généalogique » de app.js), puis seulement ces méthodes.
   Chaque méthode est protégée : une erreur ici est consignée dans la console et
   n'interrompt jamais la frise.
============================================================================ */
// Textes de la page : data-t = texte, data-tp = texte d'un champ de saisie, data-tt = infobulle
function applyStatic(){
  if(!D) return;
  document.querySelectorAll('#tree-overlay [data-t], #taf-overlay [data-t]').forEach(el=>{ el.textContent = t(el.dataset.t); });
  document.querySelectorAll('#tree-overlay [data-tp], #taf-overlay [data-tp]').forEach(el=>{ el.placeholder = t(el.dataset.tp); });
  document.querySelectorAll('#tree-overlay [data-tt], #taf-overlay [data-tt]').forEach(el=>{ el.title = t(el.dataset.tt); });
  D.emptyText.textContent = t('emptyText', catName());
  D.af.note.textContent = t('formNote', catName());
}

function init(a){
  if(inited) return true;
  api = a;
  if(!grab()){
    console.warn("Bibline — arbre : la fenêtre est absente de la page, l'arbre est désactivé.");
    D = null;
    return false;
  }
  wireUI();
  inited = true;
  applyStatic();
  try{
    if(localStorage.getItem(SEEN_KEY)){ const dot = document.querySelector('#rail-tree .new-dot'); if(dot) dot.remove(); }
  }catch(err){ /* stockage indisponible : le point « nouveau » reste affiché */ }
  return true;
}

function langChanged(lang){
  if(lang && TS[lang]) LANG = lang;
  if(!inited) return;
  applyStatic();
  if(OPEN){
    renderTree();
    if(tstate.selected) openVolet(tstate.selected);
  }
}

// Appelé à chaque modification des éléments de la frise (ajout, modification, suppression, import…)
function itemsChanged(){
  dirtyIdx();
  if(!inited || !OPEN || quiet) return;
  const sel = tstate.selected;
  renderTree();
  if(sel && tstate.selected===sel) openVolet(sel);        // titre, dates ou photo ont pu changer
}

function safe(fn, fallback){
  return function(){
    try{ return fn.apply(null, arguments); }
    catch(err){ console.error('Bibline — arbre :', err); return fallback; }
  };
}
window.BiblineArbre = {
  init: safe(init, false),
  open: safe(openTree),
  close: safe(closeTree),
  isOpen: () => OPEN,
  langChanged: safe(langChanged),
  itemsChanged: safe(itemsChanged),
  // base généalogique
  getState: safe(getState, null),                 // null = ne pas enregistrer (base illisible)
  setState: safe(setState),
  loadFailed: () => { locked = true; },
  seedIfNeeded: safe(seedIfNeeded, null),
  seedMessage: safe(seedMessage, null),
  exportFor: safe(exportFor, null),
  importFrom: safe(importFrom, {fiches:0, familles:0}),
};

})();
