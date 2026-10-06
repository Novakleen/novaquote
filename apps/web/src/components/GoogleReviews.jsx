import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, MapPin, Loader2, Quote, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';

const GoogleReviews = () => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState([]);
  const [overallRating, setOverallRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY; // Accessing from .env file
  const PLACE_ID = "ChIJ-QcYeSXYfkoRqNZxghFDTWY"; // Hardcoded Place ID for NovaKleen

  useEffect(() => {
    let isMounted = true;
    let service;

    if (!API_KEY || API_KEY.trim() === '' || API_KEY === 'undefined') {
      console.error("Google Reviews API Error: VITE_GOOGLE_API_KEY is missing or invalid.");
      setError(t('reviews.api_key_missing'));
      setIsLoading(false);
      return;
    }

    const handleSuccess = (place) => {
      if (!isMounted) return;
      setReviews(place.reviews || []);
      setOverallRating(place.rating || 0);
      setTotalRatings(place.user_ratings_total || 0);
      setIsLoading(false);
      setError(null);
    };

    const handleError = (status) => {
      if (!isMounted) return;
      console.error("Google Places API error:", status);
      setError(t('reviews.error'));
      setIsLoading(false);
    };

    const initPlacesService = () => {
      const mapDiv = document.createElement('div');
      
      try {
        if (!window.google || !window.google.maps || !window.google.maps.places) {
          throw new Error("Google Maps API not loaded properly");
        }

        service = new window.google.maps.places.PlacesService(mapDiv);
        
        const request = {
          placeId: PLACE_ID,
          fields: ['name', 'rating', 'reviews', 'user_ratings_total']
        };

        service.getDetails(request, (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            handleSuccess(place);
          } else {
            handleError(status);
          }
        });
      } catch (err) {
        handleError(err.message);
      }
    };

    // Load Google Places script if not already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      initPlacesService();
    } else {
      const scriptId = 'google-places-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&language=fr`;
        script.async = true;
        script.defer = true;
        
        script.onload = initPlacesService;
        script.onerror = () => handleError("SCRIPT_LOAD_ERROR");
        
        document.head.appendChild(script);
      } else {
        const checkInterval = setInterval(() => {
          if (window.google && window.google.maps && window.google.maps.places) {
            clearInterval(checkInterval);
            initPlacesService();
          }
        }, 100);
        setTimeout(() => clearInterval(checkInterval), 10000);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [t, API_KEY]); // Add API_KEY to dependency array

  useEffect(() => {
    if (reviews.length <= 4) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % reviews.length);
    }, 5000); 
    return () => clearInterval(interval);
  }, [reviews.length]);

  const getVisibleReviews = () => {
    if (reviews.length === 0) return [];
    if (reviews.length <= 4) return reviews;

    const visible = [];
    for (let i = 0; i < 4; i++) {
      visible.push(reviews[(currentIndex + i) % reviews.length]);
    }
    return visible;
  };

  const visibleReviews = getVisibleReviews();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12 bg-gray-50 min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500 font-medium">{t('reviews.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-12 bg-gray-50 min-h-[200px]">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-gray-600 max-w-md">{error}</p>
          {error === t('reviews.api_key_missing') && (
            <p className="text-sm text-gray-500 mt-2">
              Veuillez configurer <code className="bg-red-100 px-1 py-0.5 rounded text-xs font-mono">VITE_GOOGLE_API_KEY</code> dans votre fichier <code className="bg-red-100 px-1 py-0.5 rounded text-xs font-mono">.env</code>.
            </p>
          )}
          <a 
            href={`https://search.google.com/local/reviews?placeid=${PLACE_ID}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm font-medium mt-2"
          >
            {t('reviews.read_all')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center mb-16 text-center"
        >
          <div className="inline-flex items-center justify-center p-2 bg-white rounded-full shadow-sm mb-6 border border-gray-100">
            <img 
              src="https://horizons-cdn.hostinger.com/e3f7a136-f9dc-4b51-b0bf-3cfef68c9a27/cc85daa33a07a54718f7dab25e8482fa.png" 
              alt="NovaKleen Logo" 
              className="w-6 h-6 mr-1"
            />
             <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/768px-Google_%22G%22_logo.svg.png" 
              alt="Google" 
              className="w-6 h-6 mr-2"
            />
            <span className="text-sm font-semibold text-gray-600">{t('reviews.partner')}</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            {t('reviews.title')}
          </h2>
          
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12 bg-white px-8 py-6 rounded-2xl shadow-lg border border-gray-100 transform transition-transform hover:scale-105 duration-300">
            <div className="flex flex-col items-center border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-12 w-full md:w-auto">
              <span className="text-5xl font-extrabold text-gray-900 tracking-tight">{overallRating}</span>
              <div className="flex mt-2">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-5 h-5 ${i < Math.round(overallRating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} 
                  />
                ))}
              </div>
            </div>
            
            <div className="text-center md:text-left">
              <p className="text-lg font-semibold text-gray-800 mb-1">{t('reviews.excellent')}</p>
              <p className="text-gray-500">
                {t('reviews.based_on')} <span className="font-bold text-gray-900">{totalRatings} {t('reviews.reviews_count')}</span>
              </p>
              <div className="flex items-center gap-2 mt-2 text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full w-fit mx-auto md:mx-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('reviews.verified')}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {visibleReviews.map((review, index) => (
            <motion.div
              key={`${review.author_name}-${review.time}`} 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="h-full"
            >
              <Card className="h-full flex flex-col hover:shadow-xl transition-all duration-300 border-t-4 border-t-blue-500 border-x-gray-100 border-b-gray-100 bg-white group">
                <CardContent className="p-6 flex flex-col flex-grow relative">
                  <Quote className="absolute top-4 right-4 w-6 h-6 text-gray-100 group-hover:text-blue-50 transition-colors" />
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border-2 border-white shadow-sm flex-shrink-0">
                      {review.profile_photo_url ? (
                        <img src={review.profile_photo_url} alt={review.author_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-bold text-sm">
                          {review.author_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-gray-900 leading-tight text-sm truncate">{review.author_name}</h4>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        {review.relative_time_description}
                      </p>
                    </div>
                  </div>

                  <div className="flex mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} 
                      />
                    ))}
                  </div>

                  <p className="text-gray-600 text-xs leading-relaxed flex-grow italic">
                    "{review.text}"
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <a 
            href={`https://search.google.com/local/reviews?placeid=${PLACE_ID}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white border border-gray-200 rounded-full text-gray-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 font-semibold transition-all shadow-sm hover:shadow-md"
          >
            {t('reviews.read_all')}
            <MapPin className="w-4 h-4" />
          </a>
        </div>
      </div>
  );
};

export default GoogleReviews;