import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

const BuildingSelector = ({ 
  buildings, 
  selectedId, 
  onRecalculate,
  isRecalculating 
}) => {
  const { t } = useTranslation();

  if (!buildings || buildings.length === 0) return null;

  const selectedBuilding = buildings.find(b => b.id === selectedId);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto flex flex-col items-end gap-2 z-[400]"
      >
        {selectedBuilding && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/95 backdrop-blur-md border border-green-200 shadow-lg rounded-lg p-3 flex items-center gap-3 text-sm"
          >
            <div className="bg-green-100 p-1.5 rounded-full">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">
                 {t('building_selector.selected', 'Building Selected')}
              </p>
              <p className="text-gray-600 text-xs">
                {Math.round(selectedBuilding.area)} m² {t('building_selector.ground_area', '(Ground)')}
              </p>
            </div>
          </motion.div>
        )}

        <div className="bg-white/95 backdrop-blur-md border border-gray-200 shadow-lg rounded-lg p-2 flex items-center gap-2">
            <div className="px-2 flex items-center gap-2 text-sm text-gray-600 border-r border-gray-200 pr-3 mr-1">
                <Building2 className="w-4 h-4 text-blue-500" />
                <span className="font-medium">
                  {buildings.length} {buildings.length === 1 ? t('building_selector.building', 'Building') : t('building_selector.buildings', 'Buildings')}
                </span>
            </div>
            <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                onClick={onRecalculate}
                disabled={isRecalculating}
            >
                <RefreshCw className={cn("w-3 h-3 mr-2", isRecalculating && "animate-spin")} />
                {t('building_selector.recalculate', 'Recalculate')}
            </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BuildingSelector;