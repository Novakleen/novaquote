import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from '@/hooks/useTranslation';

// Detects direct coordinate input like "50.359120, 5.378172"
const COORD_REGEX = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

const parseCoordinates = (query) => {
  const match = query.match(COORD_REGEX);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
};

const AddressInput = ({ value, onChange, onSelect }) => {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef(null);
  const wrapperRef = useRef(null);
  const abortControllerRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const searchAddress = async (query) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=be&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'RoofCleaningQuoteGenerator/1.0'
          },
          signal: abortControllerRef.current.signal
        }
      );
      
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Address search error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (newValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Direct coordinate input: skip Nominatim and offer the parsed coords
    const coords = parseCoordinates(newValue);
    if (coords) {
      setSuggestions([{
        place_id: `coord-${coords.lat}-${coords.lng}`,
        display_name: `Coordonnées ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
        lat: String(coords.lat),
        lon: String(coords.lng),
        isCoordinate: true
      }]);
      setShowSuggestions(true);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      searchAddress(newValue);
    }, 500);
  };

  const handleSelectSuggestion = (suggestion) => {
    onChange(suggestion.display_name);
    onSelect(suggestion.display_name, {
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    });
    
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleClearInput = () => {
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div ref={wrapperRef} className='relative'>
      <div className='relative'>
        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={t('address_input.placeholder')}
          className='w-full pl-10 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors text-gray-900'
        />
        {value && (
          <button
            onClick={handleClearInput}
            className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors'
            aria-label={t('address_input.clear')}
          >
            <X className='w-5 h-5' />
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className='absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto'>
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.place_id}-${index}`}
              onClick={() => handleSelectSuggestion(suggestion)}
              className='w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-blue-50'
            >
              <div className='flex items-start gap-2'>
                {suggestion.isCoordinate ? (
                  <MapPin className='w-4 h-4 text-blue-500 mt-1 flex-shrink-0' />
                ) : (
                  <Search className='w-4 h-4 text-gray-400 mt-1 flex-shrink-0' />
                )}
                <span className='text-sm text-gray-700 line-clamp-2'>{suggestion.display_name}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
          <div className='w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
        </div>
      )}
    </div>
  );
};

export default AddressInput;