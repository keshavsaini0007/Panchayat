import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2, MapPin, Upload, X, Check, ChevronLeft, ChevronRight, Crosshair, AlertCircle,
} from "lucide-react";
import { MapContainer, Marker, useMapEvents } from "react-leaflet";
import { MapTileLayer } from "@/components/map/MapTileLayer";
import L from "leaflet";
import { toast } from "@/hooks/use-toast";
import { createComplaint } from "@/services/complaintService";
import { COMPLAINT_CATEGORIES } from "@/utils/constants";
import { reverseGeocode } from "@/services/geocodingService";
import { compressImage } from "@/utils/imageCompression";
import { validateImageFile, validateImageCount, validateImageDimensions, MAX_IMAGES } from "@/utils/imageValidation";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/FloatingLabelInput";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const step1Schema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(30, "Description must be at least 30 characters"),
  village: z.string().min(1, "Village is required"),
  ward: z.string().min(1, "Ward is required"),
});

const formatFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const generateImageId = () => `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [plusCode, setPlusCode] = useState("");
  const [images, setImages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const imagesRef = useRef([]);

  const [step1Data, setStep1Data] = useState(null);

  const resolver = useMemo(() => zodResolver(step1Schema), []);
  const step1Form = useForm({ resolver });
  const [step2Location, setStep2Location] = useState("");

  const canProceedFromStep1 = step === 1 && step1Form.formState.isValid;

  useEffect(() => {
    if (step === 1 && step1Data) {
      const values = step1Form.getValues();
      Object.entries(step1Data).forEach(([key, val]) => {
        if (values[key] !== val) step1Form.setValue(key, val);
      });
    }
  }, [step, step1Data]);

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
      toast({ title: countValidation.error, variant: "destructive" });
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
      errors.forEach(({ name, error }) =>
        toast({ title: `${name}: ${error}`, variant: "destructive" })
      );
    }

    if (validFiles.length === 0) return;

    const dimensionErrors = [];
    for (const file of validFiles) {
      const dimResult = await validateImageDimensions(file);
      if (!dimResult.valid) {
        dimensionErrors.push({ name: file.name, error: dimResult.error });
      }
    }
    if (dimensionErrors.length > 0) {
      dimensionErrors.forEach(({ name, error }) =>
        toast({ title: `${name}: ${error}`, variant: "destructive" })
      );
      return;
    }

    const newImages = validFiles.map((file) => ({
      id: generateImageId(),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      compressedSize: null,
      compressedFile: null,
      status: "pending",
    }));

    setImages((prev) => {
      const updated = [...prev, ...newImages];
      imagesRef.current = updated;
      return updated;
    });

    for (const img of newImages) {
      setImages((prev) =>
        prev.map((i) => (i.id === img.id ? { ...i, status: "compressing" } : i))
      );
      try {
        const compressed = await compressImage(img.file);
        setImages((prev) =>
          prev.map((i) =>
            i.id === img.id
              ? { ...i, status: "compressed", compressedFile: compressed, compressedSize: compressed.size, file: compressed }
              : i
          )
        );
      } catch (err) {
        console.error("Compression error:", err);
        setImages((prev) =>
          prev.map((i) =>
            i.id === img.id ? { ...i, status: "error", error: "Failed to compress image." } : i
          )
        );
      }
    }
  };

  const handleImageSelect = (e) => {
    processFiles(e.target.files);
    e.target.value = "";
  };

  const removeImage = (id) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) { try { URL.revokeObjectURL(img.preview); } catch {} }
      const updated = prev.filter((i) => i.id !== id);
      imagesRef.current = updated;
      return updated;
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFiles(e.dataTransfer.files);
  };

  const center = useMemo(() => [20.5937, 78.9629], []);

  const doReverseGeocode = async (lat, lng) => {
    setResolvingAddress(true);
    const result = await reverseGeocode(lat, lng);
    if (result.address) {
      setResolvedAddress(result.address);
      setStep2Location(result.address);
    }
    if (result.plusCode) setPlusCode(result.plusCode);
    if (result.error) toast({ title: result.error, variant: "destructive" });
    setResolvingAddress(false);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", variant: "destructive" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMarker(loc);
        setPosition(loc);
        setMapZoom(16);
        setLocating(false);
        doReverseGeocode(loc.lat, loc.lng);
      },
      (err) => {
        setLocating(false);
        const messages = {
          1: "Location access denied.",
          2: "Location unavailable.",
          3: "Location request timed out.",
        };
        toast({ title: messages[err.code] || "Failed to get location.", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };

  const handleMapClick = (pos) => doReverseGeocode(pos.lat, pos.lng);

  const handleSubmit = async () => {
    if (!step1Data) return;
    setSubmitting(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append("title", step1Data.title);
      formData.append("category", step1Data.category);
      formData.append("description", step1Data.description);
      formData.append("village", step1Data.village);
      formData.append("ward", step1Data.ward);
      const locationPayload = {
        address: resolvedAddress || step2Location || "",
        lat: marker?.lat || "",
        lng: marker?.lng || "",
      };
      if (plusCode) locationPayload.plusCode = plusCode;
      formData.append("location", JSON.stringify(locationPayload));
      images.forEach((img) => formData.append("images", img.compressedFile || img.file));
      await createComplaint(formData, (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(progress);
      });
      toast({ title: "Complaint submitted!" });
      navigate("/my-complaints");
    } catch (err) {
      toast({
        title: "Failed to submit",
        description: err.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => {
        try { URL.revokeObjectURL(img.preview); } catch {}
      });
    };
  }, []);

  return (
    <PageTransition className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Submit a Complaint</h1>

      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition ${
                s <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && (
              <div className={`h-1 flex-1 rounded ${s < step ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold pb-3">Basic Information</h2>

            <div className="space-y-2">
              <FloatingLabelInput id="title" label="Title" {...step1Form.register("title")} />
              {step1Form.formState.errors.title && (
                <p className="text-sm font-medium text-destructive">{step1Form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                onValueChange={(v) => step1Form.setValue("category", v)}
                defaultValue={step1Form.getValues("category")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {COMPLAINT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {step1Form.formState.errors.category && (
                <p className="text-sm font-medium text-destructive">{step1Form.formState.errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...step1Form.register("description")} rows={4} placeholder="Describe the issue in detail (min 30 characters)" />
              {step1Form.formState.errors.description && (
                <p className="text-sm font-medium text-destructive">{step1Form.formState.errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FloatingLabelInput id="village" label="Village" {...step1Form.register("village")} />
                {step1Form.formState.errors.village && (
                  <p className="text-sm font-medium text-destructive">{step1Form.formState.errors.village.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <FloatingLabelInput id="ward" label="Ward" {...step1Form.register("ward")} />
                {step1Form.formState.errors.ward && (
                  <p className="text-sm font-medium text-destructive">{step1Form.formState.errors.ward.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleStep1Next}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <h2 className="text-lg font-semibold">Location & Photos</h2>

            <div>
              <Label className="mb-2 block">Pin Location on Map</Label>
              <Button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={locating}
                variant="outline"
                className="mb-3"
              >
                {locating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Crosshair className="mr-2 h-4 w-4" />
                )}
                {locating ? "Getting location..." : "Use My Current Location"}
              </Button>
              <div className="h-64 rounded-xl overflow-hidden border border-border">
                <MapContainer center={center} zoom={mapZoom} className="h-full w-full" key={`${position.lat}-${position.lng}-${mapZoom}`}>
                  <MapTileLayer />
                  <LocationMarker position={marker} onPositionChange={(p) => setMarker(p)} onMapClick={handleMapClick} />
                </MapContainer>
              </div>
              {marker && (
                <div className="mt-3 p-3 border  border-border rounded-lg text-sm space-y-1">
                  <p className="font-medium flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> Selected Location
                  </p>
                  <p className="text-muted-foreground">
                    Lat: <span className="font-mono">{marker.lat.toFixed(6)}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Lng: <span className="font-mono">{marker.lng.toFixed(6)}</span>
                  </p>
                  {resolvingAddress && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Resolving address...
                    </p>
                  )}
                  {resolvedAddress && !resolvingAddress && (
                    <p className="text-muted-foreground">
                      Address: <span className="text-foreground">{resolvedAddress}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <FloatingLabelInput
                id="address"
                label="Address (manual override)"
                value={step2Location}
                onChange={(e) => setStep2Location(e.target.value)}
              />
            </div>

            <div>
              <Label className="mb-2 block">
                Upload Images ({images.length}/{MAX_IMAGES})
              </Label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                  dragOver ? "border-primary/50 bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/30"
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
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="font-medium">Drag images here or click to upload</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      JPG, PNG, WEBP (max {MAX_IMAGES} images, 5 MB each)
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click or drag to add more images</p>
                  </>
                )}
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                  {images.map((img) => (
                    <div key={img.id} className="relative group rounded-lg border border-border overflow-hidden">
                      <div className="aspect-square">
                        <img src={img.preview} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="p-2 bg-muted/20">
                        <p className="text-xs truncate">{img.name}</p>
                        <p className="text-xs mt-0.5 text-muted-foreground">
                          {img.status === "compressing" ? (
                            <span className="text-primary flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" /> Compressing...
                            </span>
                          ) : img.status === "compressed" ? (
                            <span className="text-primary">
                              {formatFileSize(img.compressedSize)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{formatFileSize(img.size)}</span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {submitting && uploadProgress > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <h2 className="text-lg font-semibold">Review & Submit</h2>

            <div className="space-y-3 bg-muted/30 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Title:</span> <span className="font-medium">{step1Data?.title}</span></div>
                <div><span className="text-muted-foreground">Category:</span> <span className="font-medium capitalize">{step1Data?.category?.replace("_", " ")}</span></div>
                <div><span className="text-muted-foreground">Village:</span> <span className="font-medium">{step1Data?.village}</span></div>
                <div><span className="text-muted-foreground">Ward:</span> <span className="font-medium">{step1Data?.ward}</span></div>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Description:</span>
                <p className="font-medium mt-0.5">{step1Data?.description}</p>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Location:</span>
                <p className="font-medium mt-0.5">{resolvedAddress || step2Location || "No address"}</p>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Images:</span>
                <span className="font-medium ml-1">{images.length} file(s)</span>
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {images.map((img) => (
                      <div key={img.id} className="relative w-14 h-14 rounded-lg overflow-hidden border border-border">
                        <img src={img.preview} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? "Submitting..." : "Submit Complaint"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </PageTransition>
  );
}

export default SubmitComplaint;
