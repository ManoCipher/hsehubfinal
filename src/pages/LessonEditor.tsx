import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ArrowLeft,
  Save,
  Upload as UploadIcon,
  Video as VideoIcon,
  Settings,
  ChevronRight,
  X,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import LessonTypeSelector from "@/components/training/LessonTypeSelector";
import FileUploadZone from "@/components/training/FileUploadZone";

const lessonSchema = z.object({
  name: z.string().min(1, "Lesson name is required"),
  type: z.enum(["subchapter", "video_audio", "pdf", "text", "iframe"]),
  content_url: z.string().optional(),
  content_text: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type LessonFormData = z.infer<typeof lessonSchema>;

interface Lesson {
  id: string;
  course_id: string;
  name: string;
  type: "subchapter" | "video_audio" | "pdf" | "text" | "iframe";
  content_url: string | null;
  content_data: any;
  order_index: number;
  status: "draft" | "published";
  parent_id: string | null;
}

interface Course {
  id: string;
  name: string;
}

export default function LessonEditor() {
  const { courseId, lessonId} = useParams<{ courseId: string; lessonId: string }>();
  const { user, loading, companyId } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newTag, setNewTag] = useState("");

  const isNewLesson = lessonId === "new";

  const form = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      name: "",
      type: "video_audio",
      content_url: "",
      content_text: "",
      description: "",
      tags: [],
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (user && companyId && courseId) {
      fetchCourse();
      if (!isNewLesson && lessonId) {
        fetchLesson();
      } else {
        setIsLoading(false);
      }
    }
  }, [user, loading, navigate, companyId, courseId, lessonId, isNewLesson]);

  const fetchCourse = async () => {
    if (!courseId || !companyId) return;

    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name")
        .eq("id", courseId)
        .eq("company_id", companyId)
        .single();

      if (error) throw error;
      setCourse(data);
    } catch (err: any) {
      toast({
        title: "Error loading course",
        description: err.message,
        variant: "destructive",
      });
      navigate(`/training/${courseId}`);
    }
  };

  const fetchLesson = async () => {
    if (!lessonId || !courseId) return;

    try {
      const { data, error } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("id", lessonId)
        .eq("course_id", courseId)
        .single();

      if (error) throw error;

      setLesson(data);
      form.reset({
        name: data.name,
        type: data.type,
        content_url: data.content_url || "",
        content_text: data.content_data?.text_content || "",
        description: data.content_data?.description || "",
        tags: data.content_data?.tags || [],
      });
    } catch (err: any) {
      toast({
        title: "Error loading lesson",
        description: err.message,
        variant: "destructive",
      });
      navigate(`/training`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    
    const currentTags = form.getValues("tags") || [];
    if (!currentTags.includes(newTag.trim())) {
      form.setValue("tags", [...currentTags, newTag.trim()]);
    }
    setNewTag("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue("tags", currentTags.filter(tag => tag !== tagToRemove));
  };

  const onSubmit = async (data: LessonFormData) => {
    if (!courseId || !companyId) return;

    setIsSaving(true);
    try {
      const contentData: any = {};

      if (data.type === "text" && data.content_text) {
        contentData.text_content = data.content_text;
      }

      if (data.description) contentData.description = data.description;
      if (data.tags) contentData.tags = data.tags;

      if (isNewLesson) {
        // Get the highest order_index
        const { data: existingLessons } = await supabase
          .from("course_lessons")
          .select("order_index")
          .eq("course_id", courseId)
          .order("order_index", { ascending: false })
          .limit(1);

        const nextOrderIndex = existingLessons && existingLessons.length > 0
          ? existingLessons[0].order_index + 1
          : 0;

        const { error } = await supabase.from("course_lessons").insert([
          {
            course_id: courseId,
            name: data.name,
            type: data.type,
            content_url: data.content_url || null,
            content_data: Object.keys(contentData).length > 0 ? contentData : null,
            order_index: nextOrderIndex,
            status: "draft",
          },
        ]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Lesson created successfully",
        });
      } else {
        const { error } = await supabase
          .from("course_lessons")
          .update({
            name: data.name,
            type: data.type,
            content_url: data.content_url || null,
            content_data: Object.keys(contentData).length > 0 ? contentData : null,
          })
          .eq("id", lessonId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Lesson updated successfully",
        });
      }

      navigate(`/training`);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header with Breadcrumb */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/training/${courseId}`)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className="hover:text-foreground cursor-pointer"
                onClick={() => navigate(`/training/${courseId}`)}
              >
                {course?.name || "Course"}
              </span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground font-medium">
                {isNewLesson ? t("training.newLesson") : lesson?.name || t("training.lesson")}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("training.lessonDetails")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("training.learnMoreEditor")}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
 {/* Lesson Type Selector */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("training.lessonType")}</FormLabel>
                      <FormControl>
                        <LessonTypeSelector
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Lesson Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("training.lessonName")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("training.enterLessonName")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("training.shortDescription")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("training.shortDescriptionPlaceholder")}
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tags / Keywords */}
                <div className="space-y-3">
                  <Label>Tags / Keywords</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a new tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                    />
                    <Button type="button" onClick={handleAddTag}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {Array.isArray(form.watch("tags")) && form.watch("tags")!.length > 0 ? (
                      form.watch("tags")!.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="px-3 py-1 text-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-2 hover:text-destructive focus:outline-none"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No tags added yet.
                      </p>
                    )}
                  </div>
                </div>

                {/* Content based on type */}
                {form.watch("type") === "video_audio" && (
                  <div className="space-y-4">
                    {/* Add Video Link */}
                    <FormField
                      control={form.control}
                      name="content_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Video Link (YouTube or direct URL)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://youtube.com/watch?v=..."
                              value={field.value || ""}
                              onChange={field.onChange}
                              type="url"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Paste a YouTube or direct video/audio file URL. YouTube links will be embedded automatically.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Video Preview for YouTube links only - Cloudinary uploads show preview in FileUploadZone */}
                    {form.watch("content_url") && !form.watch("content_url")?.includes('cloudinary.com') && (
                      <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-sm font-medium">Preview</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => form.setValue("content_url", "")}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Clear
                          </Button>
                        </div>
                        {(form.watch("content_url")?.includes('youtube.com') || 
                          form.watch("content_url")?.includes('youtu.be')) ? (
                          <div className="aspect-video bg-black rounded-lg overflow-hidden">
                            <iframe
                              src={
                                form.watch("content_url")?.includes('youtube.com') 
                                  ? form.watch("content_url")?.replace('watch?v=', 'embed/')
                                  : form.watch("content_url")?.replace('youtu.be/', 'youtube.com/embed/')
                              }
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title="Video Preview"
                            />
                          </div>
                        ) : (
                          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                            <p className="text-sm text-muted-foreground">Video URL entered</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Divider */}
                    <div className="flex items-center gap-2 py-2">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-sm text-muted-foreground px-2">OR upload a file</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Option 2: Upload Video/Audio */}
                    <FormField
                      control={form.control}
                      name="content_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <FileUploadZone
                              lessonType="video_audio"
                              currentFileUrl={field.value?.includes('cloudinary.com') ? field.value : undefined}
                              onUploadComplete={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </div>
                )}

                {form.watch("type") === "pdf" && (
                  <FormField
                    control={form.control}
                    name="content_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PDF Upload</FormLabel>
                        <FormControl>
                          <FileUploadZone
                            lessonType="pdf"
                            currentFileUrl={field.value}
                            onUploadComplete={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch("type") === "text" && (
                  <FormField
                    control={form.control}
                    name="content_text"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Text Content</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter your text content here..."
                            {...field}
                            rows={10}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch("type") === "iframe" && (
                  <FormField
                    control={form.control}
                    name="content_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>iFrame URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/training/${courseId}`)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Save className="w-4 h-4 mr-2 animate-spin" />
                    {t("common.saving")}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {t("common.save")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
