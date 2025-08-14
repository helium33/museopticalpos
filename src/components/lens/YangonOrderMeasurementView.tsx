import React from 'react';
import { Eye, MapPin, Stethoscope, Bell, Expand } from 'lucide-react';
import { LensFormData } from './LensForm';

interface YangonOrderMeasurementViewProps {
  data: LensFormData;
  isCompact?: boolean;
}

const YangonOrderMeasurementView: React.FC<YangonOrderMeasurementViewProps> = ({ 
  data, 
  isCompact = false 
}) => {
  // Only show for Yangon Orders
  if (data.type !== 'Yangon Order') {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-700">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1 bg-orange-500 rounded">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200">
            Yangon Order Complete Measurements
          </h3>
          <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-full">
            အပြည့်စုံ ပမာဏ
          </span>
        </div>

        {/* Order Information */}
        {(data.yangonCustomerName || data.yangonOrderNumber || data.yangonOrderDate) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-4 border border-orange-200 dark:border-orange-700">
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4 text-orange-600" />
              Order Information - အော်ဒါ အချက်အလက်များ
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              {data.yangonCustomerName && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{data.yangonCustomerName}</div>
                </div>
              )}
              {data.yangonOrderNumber && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Order No:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{data.yangonOrderNumber}</div>
                </div>
              )}
              {data.yangonOrderDate && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Date:</span>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {new Date(data.yangonOrderDate).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Eye Measurements */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-4 border border-blue-200 dark:border-blue-700">
          <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2 text-sm">
            <Eye className="h-4 w-4 text-blue-600" />
            Eye Prescription - မျက်လုံး ဆေးညွှန်း
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* Left Eye */}
            <div className="border border-green-200 dark:border-green-600 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">L</span>
                </div>
                <span className="font-medium text-gray-800 dark:text-gray-200">Left Eye</span>
              </div>
              <div className="space-y-1">
                {data.Left && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">SPH:</span>
                    <span className="font-medium">{data.Left}</span>
                  </div>
                )}
                {data.leftCyl && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">CYL:</span>
                    <span className="font-medium">{data.leftCyl}</span>
                  </div>
                )}
                {data.leftAxis && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">AXIS:</span>
                    <span className="font-medium">{data.leftAxis}°</span>
                  </div>
                )}
                {data.leftAddition && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">ADD:</span>
                    <span className="font-medium">{data.leftAddition}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Eye */}
            <div className="border border-blue-200 dark:border-blue-600 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">R</span>
                </div>
                <span className="font-medium text-gray-800 dark:text-gray-200">Right Eye</span>
              </div>
              <div className="space-y-1">
                {(data.samePowerBothEyes ? data.Left : data.Right) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">SPH:</span>
                    <span className="font-medium">{data.samePowerBothEyes ? data.Left : data.Right}</span>
                  </div>
                )}
                {(data.samePowerBothEyes ? data.leftCyl : data.rightCyl) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">CYL:</span>
                    <span className="font-medium">{data.samePowerBothEyes ? data.leftCyl : data.rightCyl}</span>
                  </div>
                )}
                {(data.samePowerBothEyes ? data.leftAxis : data.rightAxis) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">AXIS:</span>
                    <span className="font-medium">{data.samePowerBothEyes ? data.leftAxis : data.rightAxis}°</span>
                  </div>
                )}
                {(data.samePowerBothEyes ? data.leftAddition : data.rightAddition) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">ADD:</span>
                    <span className="font-medium">{data.samePowerBothEyes ? data.leftAddition : data.rightAddition}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {data.samePowerBothEyes && (
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded text-center">
              Both eyes have same power
            </div>
          )}
        </div>

        {/* PD and Height Measurements */}
        {(data.rightPD || data.leftPD || data.totalPD || data.rightHeight || data.leftHeight) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-4 border border-purple-200 dark:border-purple-700">
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2 text-sm">
              <Expand className="h-4 w-4 text-purple-600" />
              PD & Height - မျက်ဆန် အကွာအဝေး နှင့် အမြင့်
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              {data.rightPD && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Right PD:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{data.rightPD}mm</div>
                </div>
              )}
              {data.leftPD && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Left PD:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{data.leftPD}mm</div>
                </div>
              )}
              {data.totalPD && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total PD:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{data.totalPD}mm</div>
                </div>
              )}
              {data.rightHeight && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Right Height:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{data.rightHeight}mm</div>
                </div>
              )}
              {data.leftHeight && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Left Height:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{data.leftHeight}mm</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prism Measurements */}
        {(data.rightPrism || data.leftPrism || data.rightBaseDirection || data.leftBaseDirection) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-4 border border-indigo-200 dark:border-indigo-700">
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2 text-sm">
              <div className="w-4 h-4 bg-indigo-600 rounded transform rotate-45"></div>
              Prism - ပရစ်မံ
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {(data.rightPrism || data.rightBaseDirection) && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Right Eye:</span>
                  <div className="flex gap-2">
                    {data.rightPrism && <span className="font-medium">{data.rightPrism}△</span>}
                    {data.rightBaseDirection && <span className="text-gray-600 dark:text-gray-400">{data.rightBaseDirection}</span>}
                  </div>
                </div>
              )}
              {(data.leftPrism || data.leftBaseDirection) && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Left Eye:</span>
                  <div className="flex gap-2">
                    {data.leftPrism && <span className="font-medium">{data.leftPrism}△</span>}
                    {data.leftBaseDirection && <span className="text-gray-600 dark:text-gray-400">{data.leftBaseDirection}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lens & Frame Specifications */}
        {(data.lensDesign || data.lensIndex || data.lensCoating || data.lensTint || data.frameWidth || data.bridgeSize || data.templeLength) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2 text-sm">
              <Stethoscope className="h-4 w-4 text-gray-600" />
              Specifications - အသေးစိတ်များ
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
              {data.lensDesign && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Design:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{data.lensDesign}</div>
                </div>
              )}
              {data.lensIndex && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Index:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{data.lensIndex}</div>
                </div>
              )}
              {data.lensCoating && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Coating:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{data.lensCoating}</div>
                </div>
              )}
              {data.lensTint && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Tint:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{data.lensTint}</div>
                </div>
              )}
              {data.frameWidth && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Frame Width:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{data.frameWidth}mm</div>
                </div>
              )}
              {data.bridgeSize && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Bridge:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{data.bridgeSize}mm</div>
                </div>
              )}
              {data.templeLength && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Temple:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{data.templeLength}mm</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {(data.measurementNotes || data.prescriptionNotes) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-yellow-200 dark:border-yellow-700">
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2 text-sm">
              <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              Notes - မှတ်ချက်များ
            </h4>
            <div className="space-y-2 text-sm">
              {data.measurementNotes && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Measurement Notes:</span>
                  <div className="text-gray-900 dark:text-white mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded border-l-4 border-blue-400">
                    {data.measurementNotes}
                  </div>
                </div>
              )}
              {data.prescriptionNotes && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Prescription Notes:</span>
                  <div className="text-gray-900 dark:text-white mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded border-l-4 border-green-400">
                    {data.prescriptionNotes}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default YangonOrderMeasurementView;