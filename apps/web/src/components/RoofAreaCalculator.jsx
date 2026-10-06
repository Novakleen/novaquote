import React, { useState, useEffect } from 'react';
import { Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const RoofAreaCalculator = ({ selectedBuilding }) => {
  const [unit, setUnit] = useState('sqm');
  const [displayArea, setDisplayArea] = useState(0);

  useEffect(() => {
    if (!selectedBuilding) {
      setDisplayArea(0);
      return;
    }

    // Default area from building geometry (in square meters)
    // Assuming selectedBuilding.area is already in m² from upstream calculation
    const baseArea = selectedBuilding.area || 0;
    
    // Rough estimation: Roof area is typically ~1.25x the ground footprint for pitched roofs
    const estimatedRoofArea = baseArea * 1.25;

    let convertedArea = estimatedRoofArea;

    switch (unit) {
      case 'sqft':
        convertedArea = estimatedRoofArea * 10.7639;
        break;
      case 'hectare':
        convertedArea = estimatedRoofArea / 10000;
        break;
      case 'sqm':
      default:
        convertedArea = estimatedRoofArea;
        break;
    }

    setDisplayArea(convertedArea);
  }, [selectedBuilding, unit]);

  if (!selectedBuilding) {
    return (
      <Card className="w-full bg-gray-50 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-gray-400">
          <Calculator className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">Select a building to calculate roof area</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-md border-blue-100 bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center justify-between">
          <span>Roof Area Estimation</span>
          <Calculator className="w-5 h-5 text-blue-500" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-blue-700">
                {displayArea.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Estimated Surface ({unit === 'sqm' ? 'm²' : unit === 'sqft' ? 'ft²' : 'ha'})
              </p>
            </div>
            
            <div className="w-32">
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sqm">Meters (m²)</SelectItem>
                  <SelectItem value="sqft">Feet (ft²)</SelectItem>
                  <SelectItem value="hectare">Hectares</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-md text-xs text-blue-800">
             <strong>Note:</strong> Calculation assumes a standard roof pitch multiplier of 1.25x based on the building's ground footprint of {Math.round(selectedBuilding.area)} m².
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RoofAreaCalculator;