import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, MapPin, Upload, X, Check, ChevronLeft, ChevronRight, Crosshair, AlertCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { createComplaint } from '../../services/complaintService';
import { COMPLAINT_CATEGORIES } from '../../utils/constants';
import { reverseGeocode } from '../../services/geocodingService';
import { compressImage } from '../../utils/imageCompression';
import { validateImageFile, validateImageCount, MAX_IMAGES } from '../../utils/imageValidation';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const step1Schema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(30, 'Description must be at least 30 characters'),
  village: z.string().min(1, 'Village is required'),
  ward: z.string().min(1, 'Ward is required'),
});

const step2Schema = z.object({
  address: z.string().optional(),
});

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

let imageIdCounter = 0;
const generateImageId = () => `img_${++imageIdCounter}_${Date.now()}`;

function LocationMarker({ position, onPositionChange, onMapClick }) {
  useMapEvents({
    click(e) {
      const pos = { lat: e.latlng.lat, lng: e.latlng.lng };
      onPositionChange(pos);
      if (onMapClick) onMapClick(pos);
    },
  });
  return position ? <Marker position={position} /> : null;
}

function SubmitComplaint() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [position, setPosition] = useState({ lat: 20.5937, lng: 78.9629 });
  const [mapZoom, setMapZoom] = useState(5);
  const [marker, setMarker] = useState(null);
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [plusCode, setPlusCode] = useState('');
  const [images, setImages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const [step1Data, setStep1Data] = useState(null);

  const step1Form = useForm({ resolver: zodResolver(step1Schema) });
  const step2Form = useForm({ resolver: zodResolver(step2Schema) });

  const canProceedFromStep1 = step === 1 && step1Form.formState.isValid;

  useEffect(() => {
    if (step === 1 && step1Data) {
      Object.entries(step1Data).forEach(([key, val]) => step1Form.setValue(key, val));
    }
  }, [step, step1Data, step1Form]);

  const handleStep1Next = async () => {
    const valid = await step1Form.trigger();
    if (!valid) return;
    setStep1Data(step1Form.getValues());
    setStep(2);
  };

  const processFiles = async (files) => {
    const fileArray = Array.from(files);

    const countValidation = validateImageCount(images.length, fileArray.length);
    if (!countValidation.valid) {
      toast.error(countValidation.error);
      return;
    }

    const validFiles = [];
    const errors = [];

    for (const file of fileArray) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        errors.push({ name: file.name, error: validation.error });
      } else {
        validFiles.push(file);
      }
    }

    if (errors.length > 0) {
      errors.forEach(({ name, error }) => toast.error(`${name}: ${error}`));
    }

    if (validFiles.length === 0) return;

    const newImages = validFiles.map((file) => ({
      id: generateImageId(),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      compressedSize: null,
      compressedFile: null,
      status: 'pending',
    }));

    setImages((prev) => [...prev, ...newImages]);

    for (const img of newImages) {
      setImages((prev) =>
        prev.map((i) => (i.id === img.id ? { ...i, status: 'compressing' } : i))
      );
      try {
        const compressed = await compressImage(img.file);
        setImages((prev) =>
          prev.map((i) =>
            i.id === img.id
              ? {
                  ...i,
                  status: 'compressed',
                  compressedFile: compressed,
                  compressedSize: compressed.size,
                  file: compressed,
                }
              : i
          )
        );
      } catch (err) {
        console.error('Compression error:', err);
        setImages((prev) =>
          prev.map((i) =>
            i.id === img.id
              ? { ...i, status: 'error', error: 'Failed to compress image. Using original.' }
              : i
          )
        );
      }
    }
  };

  const handleImageSelect = (e) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const removeImage = (id) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const center = useMemo(() => [20.5937, 78.9629], []);

  const doReverseGeocode = async (lat, lng) => {
    setResolvingAddress(true);
    const result = await reverseGeocode(lat, lng);
    if (result.address) {
      setResolvedAddress(result.address);
      step2Form.setValue('address', result.address);
    }
    if (result.plusCode) {
      setPlusCode(result.plusCode);
    }
    if (result.error) {
      toast.error(result.error);
    }
    setResolvingAddress(false);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, lng } = { latitude: pos.coords.latitude, lng: pos.coords.longitude };
        const loc = { lat: latitude, lng };
        setMarker(loc);
        setPosition(loc);
        setMapZoom(16);
        setLocating(false);
        doReverseGeocode(latitude, lng);
      },
      (err) => {
        setLocating(false);
        const messages = {
          1: 'Location access was denied. Please enable location permissions in your browser settings.',
          2: 'Unable to determine your location. The device location is unavailable.',
          3: 'Location request timed out. Please try again.',
        };
        toast.error(messages[err.code] || 'Failed to get current location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  };

  const handleMapClick = (pos) => {
    doReverseGeocode(pos.lat, pos.lng);
  };

  const handleSubmit = async () => {
    if (!step1Data) return;
    setSubmitting(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('title', step1Data.title);
      formData.append('category', step1Data.category);
      formData.append('description', step1Data.description);
      formData.append('village', step1Data.village);
      formData.append('ward', step1Data.ward);
      const locationPayload = {
        address: resolvedAddress || step2Form.getValues().address || '',
        lat: marker?.lat || '',
        lng: marker?.lng || '',
      };
      if (plusCode) locationPayload.plusCode = plusCode;
      formData.append('location', JSON.stringify(locationPayload));
      images.forEach((img) => {
        formData.append('images', img.compressedFile || img.file);
      });
      await createComplaint(formData, (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(progress);
      });
      toast.success('Complaint submitted!');
      navigate('/my-complaints');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Submit a Complaint</h1>

      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition ${
                s < step
                  ? 'bg-green-600 text-white'
                  : s === step
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s < step ? <Check size={16} /> : s}
            </div>
            <div className={`h-1 flex-1 rounded ${s < 3 ? (s < step ? 'bg-green-600' : 'bg-gray-200') : ''}`} />
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              {...step1Form.register('title')}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Brief title of the issue"
            />
            {step1Form.formState.errors.title && (
              <p className="text-red-500 text-xs mt-1">{step1Form.formState.errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              {...step1Form.register('category')}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select category</option>
              {COMPLAINT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            {step1Form.formState.errors.category && (
              <p className="text-red-500 text-xs mt-1">{step1Form.formState.errors.category.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              {...step1Form.register('description')}
              rows={4}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Describe the issue in detail (min 30 characters)"
            />
            {step1Form.formState.errors.description && (
              <p className="text-red-500 text-xs mt-1">{step1Form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Village</label>
              <input
                type="text"
                {...step1Form.register('village')}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Village name"
              />
              {step1Form.formState.errors.village && (
                <p className="text-red-500 text-xs mt-1">{step1Form.formState.errors.village.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
              <input
                type="text"
                {...step1Form.register('ward')}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Ward number"
              />
              {step1Form.formState.errors.ward && (
                <p className="text-red-500 text-xs mt-1">{step1Form.formState.errors.ward.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleStep1Next}
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-700">Location & Photos</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pin Location on Map</label>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={locating}
              className="flex items-center gap-2 mb-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              {locating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Crosshair size={16} />
              )}
              {locating ? 'Getting location...' : 'Use My Current Location'}
            </button>
            <div className="h-64 rounded-lg overflow-hidden border">
              <MapContainer center={center} zoom={mapZoom} className="h-full w-full" key={`${position.lat}-${position.lng}-${mapZoom}`}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationMarker position={marker} onPositionChange={(p) => setMarker(p)} onMapClick={handleMapClick} />
              </MapContainer>
            </div>
            {marker && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border text-sm space-y-1">
                <p className="font-medium text-gray-700 flex items-center gap-1">
                  <MapPin size={14} /> Selected Location
                </p>
                <p className="text-gray-500">
                  Latitude: <span className="font-mono text-gray-700">{marker.lat.toFixed(6)}</span>
                </p>
                <p className="text-gray-500">
                  Longitude: <span className="font-mono text-gray-700">{marker.lng.toFixed(6)}</span>
                </p>
                {resolvingAddress && (
                  <p className="text-gray-400 flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" /> Resolving address...
                  </p>
                )}
                {resolvedAddress && !resolvingAddress && (
                  <p className="text-gray-500">
                    Address: <span className="text-gray-700">{resolvedAddress}</span>
                  </p>
                )}
                {plusCode && (
                  <p className="text-gray-400 text-xs">
                    Plus Code: {plusCode}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address (manual override)</label>
            <input
              type="text"
              {...step2Form.register('address')}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. Near the main square"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Images ({images.length}/{MAX_IMAGES})
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
              {images.length === 0 ? (
                <>
                  <Upload size={40} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 font-medium">Drag images here or click to upload</p>
                  <p className="text-xs text-gray-400 mt-2">JPG, PNG, WEBP (max {MAX_IMAGES} images, 5 MB each)</p>
                </>
              ) : (
                <>
                  <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Click or drag to add more images</p>
                </>
              )}
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                {images.map((img) => (
                  <div key={img.id} className="relative group rounded-lg border overflow-hidden bg-gray-50">
                    <div className="aspect-square">
                      <img
                        src={img.preview}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-2 bg-white">
                      <p className="text-xs text-gray-700 truncate" title={img.name}>
                        {img.name}
                      </p>
                      <p className="text-xs mt-0.5">
                        {img.status === 'pending' ? (
                          <span className="text-gray-400">Pending compression...</span>
                        ) : img.status === 'compressing' ? (
                          <span className="text-blue-500 flex items-center gap-1">
                            <Loader2 size={10} className="animate-spin" /> Compressing...
                          </span>
                        ) : img.status === 'compressed' ? (
                          <span className="text-green-600">
                            {formatFileSize(img.compressedSize)}
                            {img.compressedSize !== img.size && (
                              <span className="text-gray-400 ml-1">
                                (was {formatFileSize(img.size)})
                              </span>
                            )}
                          </span>
                        ) : img.status === 'error' ? (
                          <span className="text-red-500 flex items-center gap-1" title={img.error}>
                            <AlertCircle size={10} /> {formatFileSize(img.size)}
                          </span>
                        ) : (
                          <span className="text-gray-400">{formatFileSize(img.size)}</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow hover:bg-red-700"
                      title="Remove image"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {submitting && uploadProgress > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>Uploading images...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 border px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              <ChevronLeft size={16} /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-700">Review & Submit</h2>

          <div className="space-y-3 bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Title:</span> <span className="font-medium">{step1Data?.title}</span></div>
              <div><span className="text-gray-500">Category:</span> <span className="font-medium capitalize">{step1Data?.category?.replace('_', ' ')}</span></div>
              <div><span className="text-gray-500">Village:</span> <span className="font-medium">{step1Data?.village}</span></div>
              <div><span className="text-gray-500">Ward:</span> <span className="font-medium">{step1Data?.ward}</span></div>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Description:</span>
              <p className="font-medium mt-0.5">{step1Data?.description}</p>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Location:</span>
              <p className="font-medium mt-0.5">
                {resolvedAddress || step2Form.getValues().address || 'No address provided'}
              </p>
              {marker && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}
                  {plusCode && ` — Plus Code: ${plusCode}`}
                </p>
              )}
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Images:</span>
              <span className="font-medium ml-1">{images.length} file(s)</span>
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {images.map((img) => (
                    <div key={img.id} className="relative w-14 h-14 rounded-lg overflow-hidden border">
                      <img src={img.preview} alt="" className="w-full h-full object-cover" />
                      {img.status === 'compressed' && (
                        <div className="absolute top-0 left-0 bg-green-600 text-white p-0.5">
                          <Check size={8} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1 border px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              <ChevronLeft size={16} /> Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-lg text-sm font-medium transition"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubmitComplaint;
