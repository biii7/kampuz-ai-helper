import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, Plus, Pencil, Trash2, FileText, Calendar, Search, Upload, Loader2, Download, Eye } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { PdfViewer } from "./PdfViewer";
import { Progress } from "@/components/ui/progress";

interface CampusDocument {
  id: string;
  title: string;
  content: string;
  metadata: any;
  created_at: string;
  file_url?: string;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
  error?: string;
}

export const CampusDocuments = () => {
  const [documents, setDocuments] = useState<CampusDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<CampusDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [bulkUploadFormData, setBulkUploadFormData] = useState({
    source: "",
    category: ""
  });
  const [previewPdf, setPreviewPdf] = useState<{ url: string; title: string } | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    source: "",
    category: ""
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("campus_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast.error("Gagal memuat dokumen");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Judul dan konten harus diisi");
      return;
    }

    try {
      const metadata = {
        source: formData.source || "Manual Input",
        category: formData.category || "Umum",
        updated_at: new Date().toISOString()
      };

      if (editingDoc) {
        const { error } = await supabase
          .from("campus_documents")
          .update({
            title: formData.title,
            content: formData.content,
            metadata
          })
          .eq("id", editingDoc.id);

        if (error) throw error;
        toast.success("Dokumen berhasil diperbarui");
      } else {
        const { error } = await supabase
          .from("campus_documents")
          .insert({
            title: formData.title,
            content: formData.content,
            metadata
          });

        if (error) throw error;
        toast.success("Dokumen berhasil ditambahkan");
      }

      setIsDialogOpen(false);
      resetForm();
      loadDocuments();
    } catch (error) {
      console.error("Error saving document:", error);
      toast.error("Gagal menyimpan dokumen");
    }
  };

  const handleEdit = (doc: CampusDocument) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title,
      content: doc.content,
      source: doc.metadata?.source || "",
      category: doc.metadata?.category || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus dokumen ini?")) return;

    try {
      const { error } = await supabase
        .from("campus_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Dokumen berhasil dihapus");
      loadDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Gagal menghapus dokumen");
    }
  };

  const resetForm = () => {
    setFormData({ title: "", content: "", source: "", category: "" });
    setEditingDoc(null);
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (uploadFiles.length === 0) {
      toast.error("Pilih minimal 1 file PDF");
      return;
    }

    const invalidFiles = uploadFiles.filter(f => !f.type.includes('pdf'));
    if (invalidFiles.length > 0) {
      toast.error("Hanya file PDF yang diperbolehkan");
      return;
    }

    setIsUploading(true);
    
    // Initialize progress tracking
    const progressList: UploadProgress[] = uploadFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }));
    setUploadProgress(progressList);

    // Process files one by one
    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      
      try {
        // Update status to uploading
        setUploadProgress(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: 'uploading', progress: 25 } : p
        ));

        // Generate title from filename if not provided
        const title = file.name.replace('.pdf', '').replace(/[-_]/g, ' ');
        
        // Upload file to Supabase Storage
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: uploadError } = await supabase.storage
          .from('campus-documents')
          .upload(fileName, file);

        if (uploadError) {
          throw new Error('Gagal mengupload file');
        }

        // Update progress
        setUploadProgress(prev => prev.map((p, idx) => 
          idx === i ? { ...p, progress: 50 } : p
        ));

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('campus-documents')
          .getPublicUrl(fileName);

        // Update status to processing
        setUploadProgress(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: 'processing', progress: 75 } : p
        ));

        // Call edge function to parse PDF
        const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-pdf-document', {
          body: {
            fileUrl: publicUrl,
            title,
            category: bulkUploadFormData.category || "Umum",
            source: bulkUploadFormData.source || "Upload PDF"
          }
        });

        if (parseError || !parseData.success) {
          throw new Error(parseData?.error || 'Gagal memproses PDF');
        }

        // Success
        setUploadProgress(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: 'success', progress: 100 } : p
        ));

      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        setUploadProgress(prev => prev.map((p, idx) => 
          idx === i ? { 
            ...p, 
            status: 'error', 
            progress: 0,
            error: error instanceof Error ? error.message : 'Gagal mengupload'
          } : p
        ));
      }
    }

    // Show final results
    const successCount = uploadProgress.filter(p => p.status === 'success').length;
    const errorCount = uploadProgress.filter(p => p.status === 'error').length;
    
    if (successCount > 0) {
      toast.success(`${successCount} dokumen berhasil diupload!`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} dokumen gagal diupload`);
    }

    setIsUploading(false);
    
    // Reset after a delay to show final status
    setTimeout(() => {
      setUploadFiles([]);
      setUploadProgress([]);
      setBulkUploadFormData({ source: "", category: "" });
      setIsDialogOpen(false);
      loadDocuments();
    }, 2000);
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.metadata?.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 -mx-6 md:-mx-8 px-6 md:px-8 py-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              Dokumen Kampus
            </h1>
            <p className="text-muted-foreground mt-1">
              Kelola dokumen referensi untuk chatbot AI
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Dokumen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl glass-card max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {editingDoc ? "Edit Dokumen" : "Tambah Dokumen Baru"}
                </DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="manual" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual">
                    <FileText className="h-4 w-4 mr-2" />
                    Input Manual
                  </TabsTrigger>
                  <TabsTrigger value="upload">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload PDF
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="space-y-4">
                  <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-foreground">Judul Dokumen *</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Contoh: Profil UIN Alauddin Makassar"
                      className="glass border-border/50 mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Kategori</label>
                    <Input
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Contoh: Profil, Akademik, Fasilitas"
                      className="glass border-border/50 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Sumber</label>
                    <Input
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      placeholder="Contoh: Website Resmi, Instagram"
                      className="glass border-border/50 mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Konten Dokumen *</label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Masukkan konten dokumen yang akan dipelajari oleh chatbot AI..."
                    className="glass border-border/50 mt-1 min-h-[300px]"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Tips: Semakin detail dan terstruktur informasinya, semakin baik chatbot dapat menjawab pertanyaan
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Batal
                  </Button>
                  <Button type="submit" className="gradient-primary">
                    {editingDoc ? "Perbarui" : "Simpan"}
                  </Button>
                </div>
              </form>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <form onSubmit={handleBulkUpload} className="space-y-4">
                    <div className="glass-card p-6 border-2 border-dashed border-primary/30 rounded-lg">
                      <div className="text-center space-y-4">
                        <Upload className="h-12 w-12 text-primary mx-auto" />
                        <div>
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="application/pdf"
                              multiple
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                setUploadFiles(files);
                              }}
                              className="hidden"
                            />
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                              <Upload className="h-4 w-4" />
                              {uploadFiles.length > 0 
                                ? `${uploadFiles.length} file dipilih` 
                                : "Pilih File PDF (Multiple)"}
                            </div>
                          </label>
                          <p className="text-xs text-muted-foreground mt-2">
                            Maksimal 50MB per file • Format: PDF • Multiple files
                          </p>
                        </div>
                      </div>
                    </div>

                    {uploadFiles.length > 0 && (
                      <div className="glass-card p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-foreground">File yang dipilih:</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {uploadFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted/20 rounded">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText className="h-4 w-4 text-primary shrink-0" />
                                <span className="truncate">{file.name}</span>
                              </div>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {uploadProgress.length > 0 && (
                      <div className="glass-card p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-foreground">Progress Upload:</h4>
                        <div className="space-y-3">
                          {uploadProgress.map((item, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="truncate flex-1">{item.file.name}</span>
                                <Badge 
                                  variant={
                                    item.status === 'success' ? 'default' :
                                    item.status === 'error' ? 'destructive' :
                                    'secondary'
                                  }
                                  className="ml-2"
                                >
                                  {item.status === 'pending' && 'Menunggu'}
                                  {item.status === 'uploading' && 'Mengupload'}
                                  {item.status === 'processing' && 'Memproses'}
                                  {item.status === 'success' && '✓ Berhasil'}
                                  {item.status === 'error' && '✗ Gagal'}
                                </Badge>
                              </div>
                              <Progress value={item.progress} className="h-2" />
                              {item.error && (
                                <p className="text-xs text-destructive">{item.error}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-foreground">Kategori (untuk semua)</label>
                          <Input
                            value={bulkUploadFormData.category}
                            onChange={(e) => setBulkUploadFormData({ ...bulkUploadFormData, category: e.target.value })}
                            placeholder="Contoh: Akademik, Fasilitas"
                            className="glass border-border/50 mt-1"
                            disabled={isUploading}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground">Sumber (untuk semua)</label>
                          <Input
                            value={bulkUploadFormData.source}
                            onChange={(e) => setBulkUploadFormData({ ...bulkUploadFormData, source: e.target.value })}
                            placeholder="Contoh: Website, Dokumen Resmi"
                            className="glass border-border/50 mt-1"
                            disabled={isUploading}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="glass-card p-4 bg-primary/5 border border-primary/20">
                      <p className="text-sm text-muted-foreground">
                        📄 Setiap file PDF akan diproses secara otomatis oleh AI untuk mengekstrak teks. 
                        Judul dokumen akan diambil dari nama file. Proses akan berjalan satu per satu.
                      </p>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false);
                          setUploadFiles([]);
                          setUploadProgress([]);
                          setBulkUploadFormData({ source: "", category: "" });
                        }}
                        disabled={isUploading}
                      >
                        Batal
                      </Button>
                      <Button 
                        type="submit" 
                        className="gradient-primary"
                        disabled={isUploading || uploadFiles.length === 0}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Memproses {uploadProgress.filter(p => p.status === 'success').length}/{uploadFiles.length}
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload {uploadFiles.length} File
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Cari dokumen berdasarkan judul, konten, atau kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 glass border-border/50"
          />
        </div>
      </div>

      {/* Info Box */}
      <div className="glass-card p-6 border-l-4 border-primary/50">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-primary mt-1 shrink-0" />
          <div>
            <h3 className="font-semibold text-foreground mb-2">Tentang Dokumen Kampus</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Dokumen-dokumen yang ditambahkan di sini akan dipelajari oleh chatbot AI menggunakan teknologi RAG 
              (Retrieval-Augmented Generation). Ketika mahasiswa bertanya tentang informasi kampus, chatbot akan 
              mencari informasi relevan dari dokumen-dokumen ini untuk memberikan jawaban yang akurat dan terpercaya.
            </p>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="glass-card p-6 card-elevated">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            {filteredDocuments.length} Dokumen Tersedia
          </h2>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary/30 border-t-primary"></div>
            <p className="text-muted-foreground mt-4">Memuat dokumen...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? "Tidak ada dokumen yang sesuai dengan pencarian" : "Belum ada dokumen. Tambahkan dokumen pertama!"}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="grid gap-4">
              {filteredDocuments.map((doc, index) => (
                <Card
                  key={doc.id}
                  className="glass-card p-6 hover:scale-[1.01] transition-all"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <h3 className="text-lg font-semibold text-foreground">{doc.title}</h3>
                        {doc.metadata?.category && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                            {doc.metadata.category}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="prose prose-sm max-w-none mb-4">
                        <p className="text-muted-foreground line-clamp-3">
                          {doc.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(doc.created_at), "dd MMMM yyyy, HH:mm", { locale: id })}
                        </div>
                        {doc.metadata?.source && (
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {doc.metadata.source}
                          </div>
                        )}
                        {doc.file_url && (
                          <a 
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <Download className="h-3 w-3" />
                            Download PDF
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {doc.file_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewPdf({ url: doc.file_url!, title: doc.title })}
                          className="glass hover:bg-primary/10"
                          title="Preview PDF"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(doc)}
                        className="glass"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(doc.id)}
                        className="glass hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* PDF Viewer Modal */}
      {previewPdf && (
        <PdfViewer
          fileUrl={previewPdf.url}
          title={previewPdf.title}
          isOpen={true}
          onClose={() => setPreviewPdf(null)}
        />
      )}
    </div>
  );
};
