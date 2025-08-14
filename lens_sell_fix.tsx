// 🎨 ENHANCED: Premium Flat-top Sell Interface - Clean Implementation
// This replaces the problematic section around lines 1756-1786

            {/* 🎨 ENHANCED: Premium Flat-top Sell Interface */}
            {row.type !== 'Error' && row.type !== 'SMS' && row.type !== 'Yangon Order' && canManageLenses && (
              <div className="relative group">
                {/* 🔥 FLAT-TOP PREMIUM SELL INTERFACE */}
                {((row.type === 'Bifocal' && row.bifocalType === 'Flattop') || 
                  (row.type === 'SMS' && row.smsBifocalType === 'Flattop')) ? (
                  <div className="flex items-center gap-1">
                    {/* 👁️ Right Eye Sell Button */}
                    <div className="relative">
                      <Button
                        variant={row.rightQty > 0 ? "success" : "outline"}
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (row.rightQty > 0) {
                            setLensToSell(row);
                            setSellBifocalDialogOpen(true);
                          }
                        }}
                        disabled={row.rightQty <= 0}
                        className={`p-1 h-8 w-8 rounded-full transition-all duration-300 transform hover:scale-110 ${
                          row.rightQty > 0 
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-300 border-2 border-blue-200' 
                            : 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600'
                        }`}
                        title={`Right Eye: ${row.rightQty} pieces available`}
                      >
                        <div className="relative flex items-center justify-center">
                          <span className={`text-xs font-bold ${
                            row.rightQty > 0 ? 'text-white' : 'text-gray-400 dark:text-gray-600'
                          }`}>
                            R
                          </span>
                          {row.rightQty > 0 && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white text-[8px] font-bold text-black flex items-center justify-center">
                              {row.rightQty > 9 ? '9+' : row.rightQty}
                            </div>
                          )}
                        </div>
                      </Button>
                      
                      {/* Quick Sell Dropdown for Right */}
                      {row.rightQty > 0 && (
                        <div className="hidden group-hover:flex absolute top-0 left-full ml-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg shadow-xl z-50 p-2 flex-col gap-1 min-w-[60px]">
                          <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 text-center">RIGHT</div>
                          <div className="flex flex-col gap-1">
                            {[0.5, 1, 1.5, 2].filter(qty => row.rightQty >= qty).map((qty) => (
                              <Button
                                key={`right-${qty}`}
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleQuickSell(row, qty, e);
                                }}
                                className="px-2 py-1 text-xs min-w-0 h-6 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 dark:hover:bg-blue-900 dark:hover:text-blue-300 border-blue-200 transition-all duration-200"
                                title={`Sell ${qty} right lens(es)`}
                              >
                                {qty}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 👁️ Left Eye Sell Button */}
                    <div className="relative">
                      <Button
                        variant={row.leftQty > 0 ? "success" : "outline"}
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (row.leftQty > 0) {
                            setLensToSell(row);
                            setSellBifocalDialogOpen(true);
                          }
                        }}
                        disabled={row.leftQty <= 0}
                        className={`p-1 h-8 w-8 rounded-full transition-all duration-300 transform hover:scale-110 ${
                          row.leftQty > 0 
                            ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-300 border-2 border-green-200' 
                            : 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600'
                        }`}
                        title={`Left Eye: ${row.leftQty} pieces available`}
                      >
                        <div className="relative flex items-center justify-center">
                          <span className={`text-xs font-bold ${
                            row.leftQty > 0 ? 'text-white' : 'text-gray-400 dark:text-gray-600'
                          }`}>
                            L
                          </span>
                          {row.leftQty > 0 && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white text-[8px] font-bold text-black flex items-center justify-center">
                              {row.leftQty > 9 ? '9+' : row.leftQty}
                            </div>
                          )}
                        </div>
                      </Button>
                      
                      {/* Quick Sell Dropdown for Left */}
                      {row.leftQty > 0 && (
                        <div className="hidden group-hover:flex absolute top-0 left-full ml-1 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded-lg shadow-xl z-50 p-2 flex-col gap-1 min-w-[60px]">
                          <div className="text-[10px] font-bold text-green-600 dark:text-green-400 text-center">LEFT</div>
                          <div className="flex flex-col gap-1">
                            {[0.5, 1, 1.5, 2].filter(qty => row.leftQty >= qty).map((qty) => (
                              <Button
                                key={`left-${qty}`}
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleQuickSell(row, qty, e);
                                }}
                                className="px-2 py-1 text-xs min-w-0 h-6 hover:bg-green-50 hover:text-green-700 hover:border-green-300 dark:hover:bg-green-900 dark:hover:text-green-300 border-green-200 transition-all duration-200"
                                title={`Sell ${qty} left lens(es)`}
                              >
                                {qty}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 🔗 Both Eyes Combined Sell Button */}
                    {(row.rightQty > 0 || row.leftQty > 0) && (
                      <div className="relative">
                        <Button
                          variant={(row.rightQty > 0 && row.leftQty > 0) ? "success" : "outline"}
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setLensToSell(row);
                            setSellBifocalDialogOpen(true);
                          }}
                          className={`p-1 h-8 w-10 rounded-full transition-all duration-300 transform hover:scale-110 ${
                            (row.rightQty > 0 && row.leftQty > 0)
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-300 border-2 border-purple-200' 
                              : (row.rightQty > 0 || row.leftQty > 0)
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-300 border-2 border-amber-200'
                              : 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600'
                          }`}
                          title={
                            (row.rightQty > 0 && row.leftQty > 0) 
                              ? `Both Eyes Available (R:${row.rightQty}, L:${row.leftQty})` 
                              : (row.rightQty > 0 || row.leftQty > 0)
                              ? `Only ${row.rightQty > 0 ? 'Right' : 'Left'} Eye Available`
                              : 'Out of Stock'
                          }
                        >
                          <div className="relative flex items-center justify-center gap-0.5">
                            {(row.rightQty > 0 && row.leftQty > 0) ? (
                              <>
                                <span className="text-white text-[10px] font-bold">RL</span>
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white text-[6px] font-bold text-black flex items-center justify-center">
                                  ★
                                </div>
                              </>
                            ) : (row.rightQty > 0 || row.leftQty > 0) ? (
                              <>
                                <span className="text-white text-[10px] font-bold">
                                  {row.rightQty > 0 ? 'R' : 'L'}½
                                </span>
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full border border-white text-[6px] font-bold text-white flex items-center justify-center">
                                  !
                                </div>
                              </>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600 text-[10px] font-bold">--</span>
                            )}
                          </div>
                        </Button>
                      </div>
                    )}

                    {/* 🔥 ALL SOLD Status Indicator */}
                    {row.rightQty === 0 && row.leftQty === 0 && (
                      <div className="relative">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="p-1 h-8 w-12 rounded-full bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700"
                          title="All Sold Out"
                        >
                          <div className="flex items-center justify-center">
                            <span className="text-red-500 dark:text-red-400 text-[10px] font-bold">ALL</span>
                          </div>
                        </Button>
                        <div className="absolute -top-2 -right-1 transform rotate-12">
                          <span className="text-red-500 text-xs">❌</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* 🔄 REGULAR LENS SELL BUTTON */
                  <div className="relative">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={(e) => handleSellLens(row, e)}
                      disabled={row.qty <= 0}
                      className="p-1.5 bg-green-600 hover:bg-green-700 transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                      title="Sell Lens (Custom Amount)"
                    >
                      <div className="relative flex items-center justify-center">
                        <ShoppingCart size={14} className="text-white" />
                      </div>
                    </Button>

                    {/* Regular Quick Sell Buttons for non-Flattop lenses */}
                    {row.qty > 0 && (
                      <div className="hidden group-hover:flex absolute top-0 left-full ml-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 p-2 gap-1">
                        {/* Quick sell buttons for 0.5, 1, 1.5, 2, 2.5 */}
                        {[0.5, 1, 1.5, 2, 2.5].filter(qty => row.qty >= qty).map((qty) => (
                          <Button
                            key={qty}
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleQuickSell(row, qty, e);
                            }}
                            className="px-2 py-1 text-xs min-w-0 h-7 hover:bg-green-50 hover:text-green-700 hover:border-green-300 dark:hover:bg-green-900 dark:hover:text-green-300 transition-all duration-200 hover:scale-105"
                            title={`Quick sell ${qty} pcs`}
                          >
                            {qty}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}