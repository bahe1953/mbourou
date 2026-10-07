/* Traductions arabes (clé = texte français). Le français est la langue de référence. */
const AR = {
  // Général
  'MRU': 'أوقية', 'Confirmer': 'تأكيد', 'Confirmation': 'تأكيد', 'Annuler': 'إلغاء', 'Enregistrer': 'حفظ', 'Fermer': 'إغلاق', 'Imprimer': 'طباعة',
  'Ajouter': 'إضافة', 'Modifier': 'تعديل', 'Supprimer ?': 'حذف؟', 'Supprimé': 'تم الحذف', 'Enregistré': 'تم الحفظ', 'Chargement…': 'جارٍ التحميل…',
  'Erreur': 'خطأ', 'Aucun résultat': 'لا توجد نتائج', 'Voir tout': 'عرض الكل', 'Détails': 'التفاصيل', 'Ouvrir': 'فتح', 'Exporter': 'تصدير',
  'Total': 'المجموع', 'Date': 'التاريخ', 'Heure': 'الساعة', 'Nom': 'الاسم', 'Statut': 'الحالة', 'Actif': 'نشط', 'Inactif': 'غير نشط',
  'Type': 'النوع', 'Référence': 'المرجع', 'Description': 'الوصف', 'Notes': 'ملاحظات', 'Montant': 'المبلغ', 'Quantité': 'الكمية', 'Qté': 'الكمية',
  'Prix': 'السعر', 'Coût': 'التكلفة', 'Marge': 'الهامش', 'Valeur': 'القيمة', 'Unité': 'الوحدة', 'Min': 'الأدنى', 'OK': 'جيد', 'pcs': 'قطعة',
  'sacs': 'أكياس', 'seuil': 'الحد', 'Stock': 'المخزون', 'Catégorie': 'الفئة', 'Téléphone': 'الهاتف', 'Adresse': 'العنوان', 'Motif': 'السبب',
  'Jour': 'اليوم', 'Mode': 'الطريقة', 'Nombre': 'العدد', 'Article': 'الصنف', 'Articles': 'الأصناف', 'Historique': 'السجل', 'Appliquer': 'تطبيق',
  'Forcer': 'فرض', 'au': 'إلى', 'Période du': 'الفترة من', 'Rapport': 'تقرير', 'Session expirée, reconnectez-vous': 'انتهت الجلسة، يرجى إعادة تسجيل الدخول',
  'Tous': 'الكل',

  // Connexion / en-tête
  'Gestion de Boulangerie Mauritanienne': 'تسيير المخابز الموريتانية', 'Identifiant': 'اسم المستخدم', 'Mot de passe': 'كلمة المرور', 'Se connecter': 'تسجيل الدخول',
  'Comptes par défaut': 'الحسابات الافتراضية', 'Fonctionne 100 % hors ligne': 'يعمل 100% بدون إنترنت', 'Rechercher un produit, un client, une facture…': 'ابحث عن منتج، زبون، فاتورة…',
  'Mode hors ligne': 'وضع غير متصل', 'Changer mon mot de passe': 'تغيير كلمة المرور', 'Se déconnecter': 'تسجيل الخروج', 'Ancien mot de passe': 'كلمة المرور الحالية',
  'Nouveau mot de passe': 'كلمة المرور الجديدة', 'Mot de passe modifié': 'تم تغيير كلمة المرور', 'Tickets': 'التذاكر', 'Administrateur': 'المدير', 'Caissier': 'أمين الصندوق',
  'Identifiant ou mot de passe incorrect': 'اسم المستخدم أو كلمة المرور غير صحيحة',

  // Menu
  'Tableau de bord': 'لوحة القيادة', 'Ventes (POS)': 'المبيعات (نقطة البيع)', 'Produits': 'المنتجات', 'Matières premières': 'المواد الأولية', 'Production': 'الإنتاج',
  'Recettes & prix de revient': 'الوصفات وسعر التكلفة', 'Achats': 'المشتريات', 'Clients': 'الزبائن', 'Fournisseurs': 'الموردون', 'Caisse': 'الصندوق',
  'Dépenses': 'المصاريف', 'Inventaire': 'الجرد', 'Rapports': 'التقارير', 'Employés': 'الموظفون', 'Paramètres': 'الإعدادات',

  // Tableau de bord
  "Vue d'ensemble de votre boulangerie": 'نظرة عامة على مخبزتك', "Aujourd'hui": 'اليوم', '7 jours': '7 أيام', '30 jours': '30 يوما', 'Ce mois': 'هذا الشهر',
  'Cette année': 'هذه السنة', 'Personnalisé': 'مخصص', "aujourd'hui": 'اليوم', 'ce mois': 'هذا الشهر', 'cette année': 'هذه السنة',
  'Ventes': 'المبيعات', 'ventes': 'عملية بيع', 'produits': 'منتجات', 'Bénéfice estimé': 'الربح التقديري', 'Marge brute': 'الهامش الإجمالي',
  'Caisse (espèces)': 'الصندوق (نقدا)', 'Évolution des ventes': 'تطور المبيعات', '7 derniers jours': 'آخر 7 أيام', 'Top 5 produits les plus vendus': 'أكثر 5 منتجات مبيعا',
  'Aucune vente sur la période': 'لا توجد مبيعات في هذه الفترة', 'Alertes': 'التنبيهات', 'Aucune alerte': 'لا توجد تنبيهات', 'Stock faible': 'مخزون منخفض',
  'Matière première presque épuisée': 'مادة أولية على وشك النفاد', 'Facture fournisseur impayée': 'فاتورة مورد غير مدفوعة', 'Client débiteur': 'زبون مدين',
  'Produit fini bientôt épuisé': 'منتج على وشك النفاد', 'Prix de revient': 'سعر التكلفة', 'Produit': 'المنتج', "Réservé à l'administrateur": 'مخصص للمدير',
  'Caisse initiale': 'رصيد الصندوق الأولي', 'Ventes espèces': 'المبيعات نقدا', 'Encaissements clients': 'تحصيلات الزبائن', 'Apports': 'الإيداعات',
  'Règlements fournisseurs': 'تسديدات الموردين', 'Retraits': 'السحوبات', 'Caisse théorique': 'الصندوق النظري',

  // POS
  'Rechercher un produit…': 'ابحث عن منتج…', 'Vente rapide': 'بيع سريع', 'Aucun produit': 'لا توجد منتجات', "Touchez un produit pour l'ajouter au panier": 'اضغط على منتج لإضافته إلى السلة',
  'Sous-total': 'المجموع الفرعي', 'Remise': 'الخصم', 'Mode de paiement': 'طريقة الدفع', 'Choisir un client': 'اختر زبونا', 'Client de passage': 'زبون عابر',
  'Montant reçu': 'المبلغ المستلم', 'Monnaie à rendre': 'الباقي', 'Valider la vente': 'تأكيد البيع', 'Choisissez un client pour une vente à crédit': 'اختر زبونا للبيع بالدين',
  'Vente enregistrée': 'تم تسجيل البيع', 'Rendu': 'الباقي', 'Aperçu ticket': 'معاينة التذكرة', 'Annuler la vente': 'إلغاء البيع',
  'Annuler cette vente ? Le stock sera remis et le crédit client corrigé.': 'إلغاء هذا البيع؟ سيتم إرجاع المخزون وتصحيح دين الزبون.', 'Vente annulée': 'تم إلغاء البيع',
  'Historique des ventes': 'سجل المبيعات', 'Paiement': 'الدفع', 'Aucune vente': 'لا توجد مبيعات', 'Espèces': 'نقدا', 'Bankily': 'بنكيلي', 'Sedad': 'سداد',
  'Masrivi': 'مصرفي', 'Crédit client': 'دين زبون', 'Le panier est vide': 'السلة فارغة',

  // Produits
  'Catalogue, prix de vente, stock et marge': 'الكتالوج، سعر البيع، المخزون والهامش', 'Nouveau produit': 'منتج جديد', 'Nom arabe': 'الاسم بالعربية', 'Prix de vente': 'سعر البيع',
  'Coût de revient': 'سعر التكلفة', 'Recette': 'الوصفة', 'À définir': 'غير محددة', 'Supprimer ce produit ?': 'حذف هذا المنتج؟', 'Produit utilisé : il a été désactivé': 'المنتج مستخدم: تم تعطيله',
  'Modifier le produit': 'تعديل المنتج', 'Nom (français)': 'الاسم (بالفرنسية)', 'Nom (arabe)': 'الاسم (بالعربية)', 'Stock actuel': 'المخزون الحالي',
  'Stock minimum (alerte)': 'الحد الأدنى للمخزون (تنبيه)', 'Photo': 'الصورة', 'Retirer la photo': 'إزالة الصورة', 'Ou choisissez une icône': 'أو اختر أيقونة',
  'Le coût de revient est calculé automatiquement depuis la recette.': 'يتم حساب سعر التكلفة تلقائيا من الوصفة.', 'Produit enregistré': 'تم حفظ المنتج',
  'Pains': 'الخبز', 'Viennoiseries': 'المعجنات', 'Pâtisseries': 'الحلويات', 'Sandwichs': 'السندويتشات', 'Boissons': 'المشروبات', 'Autres': 'أخرى',

  // Matières
  "Stocks, seuils d'alerte et prix moyen pondéré (PMP)": 'المخزون، حدود التنبيه والسعر المتوسط المرجح', 'Entrée de stock (achat)': 'إدخال مخزون (شراء)', 'Nouvelle matière': 'مادة جديدة',
  'Valeur du stock': 'قيمة المخزون', 'En alerte': 'في حالة تنبيه', 'Stock min': 'الحد الأدنى', 'Prix moyen': 'السعر المتوسط', 'Critique': 'حرج', 'Faible': 'منخفض',
  "Le PMP est recalculé automatiquement à chaque achat : (stock × ancien prix + quantité achetée × prix d'achat) ÷ nouveau stock.": 'يُعاد حساب السعر المتوسط المرجح تلقائيا عند كل شراء: (المخزون × السعر القديم + الكمية المشتراة × سعر الشراء) ÷ المخزون الجديد.',
  'Supprimer cette matière ?': 'حذف هذه المادة؟', 'Matière utilisée : elle a été désactivée': 'المادة مستخدمة: تم تعطيلها', 'Modifier la matière': 'تعديل المادة',
  'Prix unitaire moyen': 'متوسط سعر الوحدة', 'Utilisé pour le calcul du prix de revient': 'يُستخدم لحساب سعر التكلفة',

  // Production
  'Enregistrez les fournées : le stock de matières est déduit et le coût de revient calculé': 'سجّل الدفعات: يتم خصم المواد من المخزون وحساب سعر التكلفة',
  'Productions du': 'إنتاج يوم', 'Quantité produite': 'الكمية المنتجة', 'Coût matières': 'تكلفة المواد', 'Charges': 'الأعباء', 'Charges & pertes': 'الأعباء والخسائر', 'Coût de production': 'تكلفة الإنتاج',
  'Coût unitaire': 'تكلفة الوحدة', 'Valeur de vente': 'قيمة البيع', 'Aucune production ce jour': 'لا يوجد إنتاج هذا اليوم', 'Consommation des matières premières': 'استهلاك المواد الأولية',
  'Nouvelle production': 'إنتاج جديد', 'Seuls les produits ayant une recette sont listés.': 'تظهر فقط المنتجات التي لها وصفة.', 'Enregistrer la production': 'تسجيل الإنتاج',
  'Matière': 'المادة', 'Besoin': 'الاحتياج', 'Disponible': 'المتوفر', 'Marge prévue': 'الهامش المتوقع', 'Stock insuffisant pour certaines matières': 'مخزون غير كاف لبعض المواد',
  'Production enregistrée': 'تم تسجيل الإنتاج', 'Enregistrer quand même (stock négatif) ?': 'التسجيل رغم ذلك (مخزون سالب)؟',
  'Supprimer cette production ? Les matières seront remises en stock.': 'حذف هذا الإنتاج؟ سيتم إرجاع المواد إلى المخزون.',

  // Recettes
  'Fiches techniques : ingrédients, charges et calcul automatique du coût de revient': 'البطاقات التقنية: المكونات والأعباء والحساب التلقائي لسعر التكلفة',
  'Synthèse des coûts de revient': 'ملخص أسعار التكلفة', 'Marge cible': 'الهامش المستهدف', 'Rendement': 'المردود', 'Coût du lot': 'تكلفة الدفعة', 'Marge unitaire': 'هامش الوحدة',
  'Taux de marge': 'نسبة الهامش', 'Coefficient': 'المعامل', 'Prix conseillé': 'السعر المقترح', 'Recette non définie — cliquez pour la créer': 'الوصفة غير محددة — اضغط لإنشائها',
  'Fiche technique': 'البطاقة التقنية', 'Enregistrer la recette': 'حفظ الوصفة', 'Rendement (unités par fournée)': 'المردود (عدد الوحدات في الدفعة)', 'Prix de vente unitaire': 'سعر بيع الوحدة',
  'Pertes / chutes': 'الخسائر / الهدر', 'Ingrédients (pour une fournée)': 'المكونات (لدفعة واحدة)', 'Ingrédient': 'المكون', 'Prix unitaire': 'سعر الوحدة',
  'Ajouter un ingrédient': 'إضافة مكون', 'Charges par fournée': 'الأعباء لكل دفعة', "Main d'œuvre": 'اليد العاملة', 'Énergie (gaz, électricité)': 'الطاقة (غاز، كهرباء)',
  'Emballage': 'التغليف', 'Autres frais': 'مصاريف أخرى', 'Notes / mode opératoire': 'ملاحظات / طريقة التحضير', 'Simulation de production': 'محاكاة الإنتاج',
  'Quantité à produire': 'الكمية المراد إنتاجها', 'Pertes': 'الخسائر', 'Énergie': 'الطاقة', 'Coût des matières premières': 'تكلفة المواد الأولية',
  "Charges (main d'œuvre, énergie, emballage…)": 'الأعباء (يد عاملة، طاقة، تغليف…)', "Chiffre d'affaires de la fournée": 'رقم أعمال الدفعة', 'Marge de la fournée': 'هامش الدفعة',
  'Taux de marge (sur prix de vente)': 'نسبة الهامش (من سعر البيع)', 'Taux de marque (sur coût)': 'نسبة الربح (من التكلفة)', 'Coefficient multiplicateur': 'المعامل المضاعف',
  'Prix conseillé pour': 'السعر المقترح لهامش', 'de marge': '', 'Attention : ce produit est vendu à perte !': 'تنبيه: هذا المنتج يُباع بخسارة!', 'En stock': 'في المخزون',
  'Coût total': 'التكلفة الإجمالية', 'Recette enregistrée — coût de revient mis à jour': 'تم حفظ الوصفة — تم تحديث سعر التكلفة',

  // Achats
  'Réceptions de matières premières auprès des fournisseurs': 'استلام المواد الأولية من الموردين', 'Nouvel achat': 'شراء جديد', 'Payé': 'مدفوع', 'Reste': 'المتبقي',
  'Fournisseur': 'المورد', 'Partiel': 'جزئي', 'Impayé': 'غير مدفوع', 'Aucun achat': 'لا توجد مشتريات', 'Ajouter une ligne': 'إضافة سطر', 'Montant total': 'المبلغ الإجمالي',
  'Montant payé': 'المبلغ المدفوع', 'Le stock et le prix moyen pondéré (PMP) des matières sont mis à jour automatiquement. Le reste à payer est ajouté au solde du fournisseur.': 'يتم تحديث المخزون والسعر المتوسط المرجح للمواد تلقائيا. ويُضاف المبلغ المتبقي إلى رصيد المورد.',
  "Enregistrer l'achat": 'تسجيل الشراء', 'Achat enregistré — stock mis à jour': 'تم تسجيل الشراء — تم تحديث المخزون', 'Achat': 'شراء',

  // Clients / fournisseurs
  'Comptes clients, crédits et encaissements': 'حسابات الزبائن والديون والتحصيلات', 'Fournisseurs, dettes et règlements': 'الموردون والديون والتسديدات',
  'Nouveau client': 'زبون جديد', 'Nouveau fournisseur': 'مورد جديد', 'Total des créances clients': 'إجمالي ديون الزبائن', 'Total des dettes fournisseurs': 'إجمالي الديون للموردين',
  'Clients débiteurs': 'الزبائن المدينون', 'Fournisseurs à régler': 'موردون يجب تسديدهم', 'Plafond crédit': 'سقف الدين', 'Solde': 'الرصيد', 'Débiteur': 'مدين', 'À régler': 'للتسديد',
  'Encaisser': 'تحصيل', 'Régler': 'تسديد', '0 = illimité': '0 = غير محدود', 'Solde initial (négatif = dette)': 'الرصيد الأولي (سالب = دين)',
  'Désactivé (historique existant)': 'تم التعطيل (يوجد سجل)', 'Encaissement client': 'تحصيل من زبون', 'Règlement fournisseur': 'تسديد لمورد', 'Solde actuel': 'الرصيد الحالي',
  'Paiement enregistré': 'تم تسجيل الدفع',

  // Caisse
  'Journée du': 'يوم', 'Clôturée': 'مغلق', 'Ouverte': 'مفتوح', 'Retrait': 'سحب', 'Apport': 'إيداع', 'Rouvrir': 'إعادة الفتح', 'Caisse espèces': 'الصندوق النقدي',
  'Caisse réelle (comptée)': 'الصندوق الفعلي (المعدود)', 'Différence': 'الفرق', 'Clôturer la caisse': 'إغلاق الصندوق', 'Paiements électroniques': 'المدفوعات الإلكترونية',
  'Les ventes Bankily, Sedad, Masrivi et à crédit ne passent pas par la caisse espèces.': 'مبيعات بنكيلي وسداد ومصرفي والدين لا تمر عبر الصندوق النقدي.',
  'Mouvements de caisse': 'حركات الصندوق', 'Historique des clôtures': 'سجل الإغلاقات', 'Caisse réelle': 'الصندوق الفعلي', 'Saisissez le montant réellement compté': 'أدخل المبلغ المعدود فعليا',
  'Clôturer la caisse avec': 'إغلاق الصندوق بمبلغ', 'Caisse clôturée': 'تم إغلاق الصندوق', 'Retrait de caisse': 'سحب من الصندوق', 'Apport en caisse': 'إيداع في الصندوق',
  'Caisse déjà clôturée': 'الصندوق مغلق بالفعل',

  // Dépenses
  'Charges de fonctionnement de la boulangerie': 'مصاريف تشغيل المخبزة', 'Nouvelle dépense': 'مصروف جديد', 'Aucune dépense': 'لا توجد مصاريف', 'Par catégorie': 'حسب الفئة',
  'Supprimer cette dépense ?': 'حذف هذا المصروف؟', 'Modifier la dépense': 'تعديل المصروف', 'Électricité': 'الكهرباء', 'Eau': 'الماء', 'Gaz': 'الغاز', 'Transport': 'النقل',
  'Salaires': 'الرواتب', 'Loyer': 'الإيجار', 'Entretien': 'الصيانة', 'Impôts & taxes': 'الضرائب والرسوم',

  // Inventaire
  'Comptage physique, ajustement des stocks et déclaration des pertes': 'العد الفعلي وتسوية المخزون والتصريح بالخسائر', 'Déclarer une perte / invendu': 'التصريح بخسارة / غير مباع',
  "Valider l'inventaire": 'تأكيد الجرد', 'Produits finis': 'المنتجات النهائية', 'Stock théorique': 'المخزون النظري', 'Stock réel (compté)': 'المخزون الفعلي (المعدود)', 'Écart': 'الفارق',
  'Valeur écart': 'قيمة الفارق', 'Valeur totale des écarts': 'القيمة الإجمالية للفوارق', 'Laissez vide les articles non comptés. Seuls les écarts sont enregistrés.': 'اترك الأصناف غير المعدودة فارغة. يتم تسجيل الفوارق فقط.',
  'Mouvements de stock récents': 'حركات المخزون الأخيرة', 'Saisissez au moins un stock compté': 'أدخل مخزونا معدودا واحدا على الأقل', "Valider l'inventaire et ajuster les stocks ?": 'تأكيد الجرد وتسوية المخزون؟',
  'ajustement(s)': 'تسوية', 'Perte enregistrée': 'تم تسجيل الخسارة', 'Invendu': 'غير مباع', 'Perte / casse': 'خسارة / تلف', 'Périmé': 'منتهي الصلاحية', 'Consommation interne': 'استهلاك داخلي', 'Don': 'تبرع',
  'Vente': 'بيع', 'Annulation vente': 'إلغاء بيع', 'Annulation production': 'إلغاء إنتاج', 'Correction manuelle': 'تصحيح يدوي', 'Stock initial': 'مخزون أولي', 'Perte / invendu': 'خسارة / غير مباع',

  // Rapports
  "Chiffre d'affaires": 'رقم الأعمال', 'Nombre de ventes': 'عدد المبيعات', 'Coût de revient des ventes': 'تكلفة المبيعات', 'Bénéfice net estimé': 'صافي الربح التقديري',
  'Achats de matières': 'مشتريات المواد', 'Valeur stock matières': 'قيمة مخزون المواد', "Chiffre d'affaires par jour": 'رقم الأعمال اليومي', 'Ventes par mode de paiement': 'المبيعات حسب طريقة الدفع',
  'Dépenses par catégorie': 'المصاريف حسب الفئة', 'Rentabilité par produit': 'الربحية حسب المنتج', 'Production et coût de revient réel': 'الإنتاج وسعر التكلفة الفعلي',
  'Coût unitaire moyen': 'متوسط تكلفة الوحدة', 'Consommation de matières premières': 'استهلاك المواد الأولية', 'Détail journalier': 'التفاصيل اليومية', 'Bénéfice': 'الربح',

  // Employés
  'Personnel et paiement des salaires': 'الموظفون ودفع الرواتب', 'Nouvel employé': 'موظف جديد', 'Employés actifs': 'الموظفون النشطون', 'Masse salariale mensuelle': 'كتلة الأجور الشهرية',
  'Poste': 'المنصب', "Date d'embauche": 'تاريخ التوظيف', 'Salaire mensuel': 'الراتب الشهري', 'Payer salaire': 'دفع الراتب', 'Salaire': 'راتب',
  'Salaire enregistré dans les dépenses': 'تم تسجيل الراتب في المصاريف', 'Paiements': 'المدفوعات', 'Supprimer cet employé ?': 'حذف هذا الموظف؟',

  // Paramètres
  'Configuration de la boulangerie, utilisateurs et sauvegardes': 'إعداد المخبزة والمستخدمين والنسخ الاحتياطية', 'Boulangerie': 'المخبزة', 'Slogan (français)': 'الشعار (بالفرنسية)',
  'Slogan (arabe)': 'الشعار (بالعربية)', 'Ville / pays': 'المدينة / البلد', 'NIF / Registre': 'الرقم الضريبي / السجل', 'Devise': 'العملة', 'Marge cible (%)': 'الهامش المستهدف (%)',
  'Sert au calcul du prix de vente conseillé': 'يُستخدم لحساب سعر البيع المقترح', 'Fond de caisse par défaut': 'رصيد الصندوق الافتراضي', 'Message du ticket (français)': 'رسالة التذكرة (بالفرنسية)',
  'Message du ticket (arabe)': 'رسالة التذكرة (بالعربية)', 'Utilisateurs': 'المستخدمون', 'Rôle': 'الدور',
  "Le caissier a accès aux ventes, à la production, aux clients, à la caisse, aux dépenses et à l'inventaire.": 'لأمين الصندوق صلاحية الوصول إلى المبيعات والإنتاج والزبائن والصندوق والمصاريف والجرد.',
  'Sauvegarde & restauration': 'النسخ الاحتياطي والاستعادة', 'Toutes les données sont stockées localement dans le fichier data/mbourou.db. Faites une sauvegarde régulière sur une clé USB.': 'جميع البيانات محفوظة محليا في الملف data/mbourou.db. قم بنسخ احتياطي منتظم على مفتاح USB.',
  'Télécharger une sauvegarde': 'تنزيل نسخة احتياطية', 'Restaurer une sauvegarde': 'استعادة نسخة احتياطية', 'Zone de danger': 'منطقة الخطر', 'Vider les opérations (garder catalogue)': 'مسح العمليات (مع الاحتفاظ بالكتالوج)',
  'Réinitialiser avec données de démo': 'إعادة التهيئة ببيانات تجريبية', 'Une copie de sécurité est créée automatiquement dans le dossier data/ avant toute restauration ou réinitialisation.': 'يتم إنشاء نسخة أمان تلقائيا في المجلد data/ قبل أي استعادة أو إعادة تهيئة.',
  'Paramètres enregistrés': 'تم حفظ الإعدادات', 'Restaurer cette sauvegarde ? Les données actuelles seront remplacées.': 'استعادة هذه النسخة؟ سيتم استبدال البيانات الحالية.', 'Sauvegarde restaurée': 'تمت الاستعادة',
  'Supprimer toutes les ventes, productions, achats, dépenses et mouvements ? Le catalogue, les recettes, clients et fournisseurs sont conservés.': 'حذف جميع المبيعات والإنتاج والمشتريات والمصاريف والحركات؟ يتم الاحتفاظ بالكتالوج والوصفات والزبائن والموردين.',
  'Opérations vidées': 'تم مسح العمليات', 'Effacer toute la base et recréer les données de démonstration ?': 'مسح قاعدة البيانات بالكامل وإعادة إنشاء البيانات التجريبية؟', 'Base réinitialisée': 'تمت إعادة التهيئة',
  "Modifier l'utilisateur": 'تعديل المستخدم', 'Nouvel utilisateur': 'مستخدم جديد', 'Nouveau mot de passe (laisser vide)': 'كلمة مرور جديدة (اتركها فارغة)',
  "Accès réservé à l'administrateur": 'الوصول مخصص للمدير',
};
function t(s) { if (S && S.lang === 'ar' && Object.prototype.hasOwnProperty.call(AR, s)) return AR[s]; return s; }
