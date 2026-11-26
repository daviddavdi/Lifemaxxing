"""
almanac_labels.py - mechanism labels for the NCI-ALMANAC drugs.

Fixed BEFORE any ALMANAC result was computed. (family, specific mechanism) per drug,
from each drug's known primary mechanism. Drugs that could not be identified with
confidence from their database name are labelled None and excluded from the analysis.
"""

D, R, G, C, P, H, E, O = ("DNA damage", "DNA repair / checkpoint", "growth signalling",
                          "cell division", "protein handling", "hormone", "epigenetic", "other")

ALMANAC_CLASSES = {
    # --- DNA damage: antimetabolites
    "1-(5-DEOXYPENTOFURANOSYL)-5-FLUORO-4-{[(PENTYLOXY)CARBONYL]AMINO}PYRIMIDIN-2(1H)-ONE": (D, "antimetabolite"),  # capecitabine
    "5-FLUORO-2'-DEOXYURIDINE": (D, "antimetabolite"),   # floxuridine
    "5-FU": (D, "antimetabolite"),
    "CYTARABINE HYDROCHLORIDE": (D, "antimetabolite"),
    "FLUDARABINE BASE": (D, "antimetabolite"),
    "GEMZAR (LILLY)": (D, "antimetabolite"),             # gemcitabine
    "HYDROXYUREA": (D, "antimetabolite"),
    "MERCAPTOPURINE": (D, "antimetabolite"),
    "METHOTREXATE": (D, "antimetabolite"),
    "PEMETREXED": (D, "antimetabolite"),
    "PRALATREXATE": (D, "antimetabolite"),
    "THIOGUANINE": (D, "antimetabolite"),
    # --- DNA damage: platinum
    "CARBOPLATIN": (D, "platinum"),
    "CISPLATINO": (D, "platinum"),                       # cisplatin
    "ELOXATIN (TN) (SANOFI SYNTHELAB)": (D, "platinum"), # oxaliplatin
    # --- DNA damage: alkylating / crosslinking
    "ALTRETAMINE": (D, "alkylating"),
    "BENDAMUSTINE HYDROCHLORIDE": (D, "alkylating"),
    "BUSULFAN": (D, "alkylating"),
    "CARMUSTINE": (D, "alkylating"),
    "CHLORAMBUCIL": (D, "alkylating"),
    "CYCLOPHOSPHAMIDE": (D, "alkylating"),
    "DACARBAZINE": (D, "alkylating"),
    "IFOSFAMIDE": (D, "alkylating"),
    "LOMUSTINE": (D, "alkylating"),
    "MECHLORETHAMINE HYDROCHLORIDE": (D, "alkylating"),
    "MELPHALAN HYDROCHLORIDE": (D, "alkylating"),
    "METHOXSALEN": (D, "alkylating"),                    # psoralen crosslinker
    "MITOMYCINE": (D, "alkylating"),
    "NSC 85998": (D, "alkylating"),                      # streptozocin
    "PIPOBROMAN": (D, "alkylating"),
    "PROCARBAZINE HYDROCHLORIDE": (D, "alkylating"),
    "TEMOZOLOMIDE": (D, "alkylating"),
    "THIOTEPA": (D, "alkylating"),
    "TRIETHYLENEMELAMINE": (D, "alkylating"),
    "URACIL MUSTARD": (D, "alkylating"),
    # --- DNA damage: topoisomerase / DNA binding
    "ADM HYDROCHLORIDE": (D, "topoisomerase II"),        # doxorubicin
    "ANTIBIOTIC AD 32": (D, "topoisomerase II"),         # valrubicin
    "DAUNORUBICIN HYDROCHLORIDE": (D, "topoisomerase II"),
    "DEXRAZOXANE": (D, "topoisomerase II"),
    "MITOXANTRONE": (D, "topoisomerase II"),
    "NSC141540": (D, "topoisomerase II"),                # etoposide
    "TENIPOSIDE": (D, "topoisomerase II"),
    "SN-38": (D, "topoisomerase I"),
    "TOPOTECAN HYDROCHLORIDE": (D, "topoisomerase I"),
    "ACTINOMYCIN D": (D, "DNA binding / transcription"),
    "BLEOMYCIN": (D, "DNA binding / transcription"),
    "PLICAMYCIN": (D, "DNA binding / transcription"),
    # --- growth signalling
    "ANTIBIOTIC AY 22989": (G, "PI3K/AKT/mTOR"),         # sirolimus
    "NSC733504": (G, "PI3K/AKT/mTOR"),                   # everolimus
    "ERLOTINIB HYDROCHLORIDE": (G, "EGFR family"),
    "GEFITINIB": (G, "EGFR family"),
    "LAPATINIB": (G, "EGFR family"),
    "VANDETANIB": (G, "EGFR family"),
    "AXITINIB": (G, "multi-kinase"),
    "PAZOPANIB HYDROCHLORIDE": (G, "multi-kinase"),
    "SORAFENIB": (G, "multi-kinase"),
    "SUNITINIB": (G, "multi-kinase"),
    "DASATINIB": (G, "ABL/SRC"),
    "IMATINIB": (G, "ABL/SRC"),
    "NILOTINIB": (G, "ABL/SRC"),
    "CRIZOTINIB": (G, "ALK/MET"),
    "VEMURAFENIB": (G, "BRAF"),
    "RUXOLITINIB": (G, "JAK"),
    "VISMODEGIB": (G, "hedgehog"),
    # --- cell division
    "CABAZITAXEL": (C, "microtubule"),
    "DOCETAXEL": (C, "microtubule"),
    "EMCYT (PHARMACIA)": (C, "microtubule"),             # estramustine
    "IXABEPILONE": (C, "microtubule"),
    "NAVELBINE DITARTRATE (TN)": (C, "microtubule"),     # vinorelbine
    "PACLITAXEL": (C, "microtubule"),
    "VINBLASTINE SULFATE": (C, "microtubule"),
    "VINCRISTINE SULFATE": (C, "microtubule"),
    # --- protein handling
    "BORTEZOMIB": (P, "proteasome"),
    # --- hormone / nuclear receptor
    "ABIRATERONE": (H, "androgen"),
    "ANASTROZOLE": (H, "estrogen"),
    "EXEMESTANE": (H, "estrogen"),
    "FULVESTRANT": (H, "estrogen"),
    "LETROZOLE": (H, "estrogen"),
    "RALOXIFENE": (H, "estrogen"),
    "TAMOXIFEN CITRATE": (H, "estrogen"),
    "MEGESTROL ACETATE": (H, "progestin"),
    "MITOTANE": (H, "adrenal"),
    "TRETINOIN": (H, "retinoid"),
    # --- epigenetic
    "AZACYTIDINE": (E, "DNA methylation"),
    "NSC-127716": (E, "DNA methylation"),                # decitabine
    "ROMIDEPSIN": (E, "HDAC"),
    "ZOLINZA": (E, "HDAC"),                              # vorinostat
    # --- other
    "ALLOPURINOL": (O, "xanthine oxidase"),
    "AMIFOSTINE": (O, "cytoprotectant"),
    "AMINOLEVULINIC ACID HYDROCHLORIDE": (O, "photodynamic"),
    "ARSENIC TRIOXIDE": (O, "arsenic"),
    "CELECOXIB": (O, "COX-2"),
    "IMIQUIMOD": (O, "immune"),
    "LENALIDOMIDE": (O, "immunomodulatory"),
    "THALIDOMIDE": (O, "immunomodulatory"),
    "QUINACRINE HYDROCHLORIDE": (O, "quinacrine"),
    "ZOLEDRONIC ACID": (O, "bisphosphonate"),
    # --- could not identify with confidence -> excluded
    "34793-34-5": None,
    "CHEMBL17639": None,
    "CHEMBL277800": None,
    "CO-V": None,
}
