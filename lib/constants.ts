// 施設タイプ
export const FACILITY_TYPES = {
  AFTER_SCHOOL_DAY: 'after_school_day',
  DAY_SERVICE: 'day_service',
  ROUKEN: 'rouken',
  SAH: 'sah',
  OTHER: 'other',
} as const

export const FACILITY_TYPE_LABELS: Record<string, string> = {
  [FACILITY_TYPES.AFTER_SCHOOL_DAY]: '放課後デイ',
  [FACILITY_TYPES.DAY_SERVICE]: 'デイサービス',
  [FACILITY_TYPES.ROUKEN]: '老健',
  [FACILITY_TYPES.SAH]: 'サービス付き高齢者住宅',
  [FACILITY_TYPES.OTHER]: 'その他',
}

// 職種
export const PROFESSIONS = {
  MANAGER: 'manager',
  CHILD_DEV_MANAGER: 'child_dev_manager',
  CARE_WORKER: 'care_worker',
  NURSE: 'nurse',
  PT: 'pt',
  OT: 'ot',
  ST: 'st',
  CARE_MANAGER: 'care_manager',
  OTHER: 'other',
} as const

export const PROFESSION_LABELS: Record<string, string> = {
  [PROFESSIONS.MANAGER]: '管理者',
  [PROFESSIONS.CHILD_DEV_MANAGER]: '児童発達支援管理責任者',
  [PROFESSIONS.CARE_WORKER]: '介護士',
  [PROFESSIONS.NURSE]: '看護師',
  [PROFESSIONS.PT]: 'PT（理学療法士）',
  [PROFESSIONS.OT]: 'OT（作業療法士）',
  [PROFESSIONS.ST]: 'ST（言語聴覚士）',
  [PROFESSIONS.CARE_MANAGER]: 'ケアマネジャー',
  [PROFESSIONS.OTHER]: 'その他',
}

// ロール
export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
} as const

export const ROLE_LABELS: Record<string, string> = {
  [ROLES.ADMIN]: '管理者',
  [ROLES.STAFF]: '一般職員',
}

// グループタイプ
export const GROUP_TYPES = {
  CLIENT: 'client',
  MULTIDISCIPLINARY: 'multidisciplinary',
  COMMUNITY: 'community',
} as const

export const GROUP_TYPE_LABELS: Record<string, string> = {
  [GROUP_TYPES.CLIENT]: '利用者グループ',
  [GROUP_TYPES.MULTIDISCIPLINARY]: '多職種グループ',
  [GROUP_TYPES.COMMUNITY]: 'コミュニティ',
}

// 投稿サイド
export const POST_SIDES = {
  CARE: 'care',
  CLIENT: 'client',
} as const

export const POST_SIDE_LABELS: Record<string, string> = {
  [POST_SIDES.CARE]: '介護側',
  [POST_SIDES.CLIENT]: '利用者側',
}

// リアクションタイプ
export const REACTION_TYPES = {
  OK: 'ok',
  THANKS: 'thanks',
  CHECK: 'check',
} as const

export const REACTION_TYPE_LABELS: Record<string, string> = {
  [REACTION_TYPES.OK]: '了解',
  [REACTION_TYPES.THANKS]: 'ありがとう',
  [REACTION_TYPES.CHECK]: '確認',
}

// ファイルタイプ
export const FILE_TYPES = {
  IMAGE: 'image',
  PDF: 'pdf',
  OTHER: 'other',
} as const

export const FILE_TYPE_LABELS: Record<string, string> = {
  [FILE_TYPES.IMAGE]: '画像',
  [FILE_TYPES.PDF]: 'PDF',
  [FILE_TYPES.OTHER]: 'その他',
}


