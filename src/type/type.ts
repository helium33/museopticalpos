export type Store = 'win' | 'pwint' | 'yangon';
export type LensType = 'Single Vision' | 'Bifocal' | 'SMS' | 'Error' | 'Yangon Order';
export type BifocalType = 'Fuse' | 'Flattop' | 'Multifocal';

export interface LensData {
  id?: string;
  code: string;
  type: LensType;
  bifocalType?: BifocalType;
  category: string;
  originalQty: number;
  qty: number;
  soldQty: number;
  errorQty?: number;
  price: number;
  sph?: string;
  cyl?: string;
  axis?: string;
  addition?: string;
  Right?: string;
  Left?: string;
  rightAxis?: string;
  leftAxis?: string;
  rightCyl?: string;
  leftCyl?: string;
  rightQty?: number;
  leftQty?: number;
  rightSoldQty?: number;
  leftSoldQty?: number;
  rightErrorQty?: number;
  leftErrorQty?: number;
  originalRightQty?: number;
  originalLeftQty?: number;
  store: Store;
  lastUpdated?: Date;
  errorReason?: string;
  matchedLensId?: string;
  matchedLensCode?: string;
  isAutoDeducted?: boolean;
}

export interface ErrorLensEntry {
  id?: string;
  code: string;
  category: string;
  qty: number;
  sph?: string;
  cyl?: string;
  axis?: string;
  addition?: string;
  errorReason: string;
  store: Store;
  matchedLensId?: string;
  matchedLensCode?: string;
  deductedQty: number;
  createdAt: Date;
}