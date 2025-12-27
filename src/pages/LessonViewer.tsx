import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  ChevronRight,
  Video,
  FileText,
  Type,
  Code,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Lesson {
  id: string;
  course_id: string;
  name: string;
  type: "subchapter" | "video_audio" | "pdf" | "text" | "iframe";
  content_url: string | null;
  content_data: any;
  order_index: number;
  status: "draft" | "published";
}

interface Course {
  id: string;
  name: string;
}

export default function LessonViewer() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { user, loading, companyId } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (user && companyId && courseId && lessonId) {
      fetchCourse();
      fetchLesson();
    }
  }, [user, loading, navigate, companyId, courseId, lessonId]);

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
      navigate("/training");
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
    } catch (err: any) {
      toast({
        title: "Error loading lesson",
        description: err.message,
        variant: "destructive",
      });
      navigate("/training");
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video_audio":
        return <Video className="w-6 h-6" />;
      case "pdf":
        return <FileText className="w-6 h-6" />;
      case "text":
        return <Type className="w-6 h-6" />;
      case "iframe":
        return <Code className="w-6 h-6" />;
      case "subchapter":
        return <FolderOpen className="w-6 h-6" />;
      default:
        return <FileText className="w-6 h-6" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "video_audio":
        return "Video/Audio";
      case "pdf":
        return "PDF";
      case "text":
        return "Text";
      case "iframe":
        return "iFrame";
      case "subchapter":
        return "Subchapter";
      default:
        return type;
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Lesson not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header with Breadcrumb */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
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
                {lesson.name}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Lesson Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white">
                {getTypeIcon(lesson.type)}
              </div>
              <div>
                <CardTitle className="text-2xl">{lesson.name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{getTypeLabel(lesson.type)}</Badge>
                  <Badge variant={lesson.status === "published" ? "default" : "secondary"}>
                    {lesson.status === "published" ? "Published" : "Draft"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          {lesson.content_data?.description && (
            <CardContent>
              <p className="text-muted-foreground">{lesson.content_data.description}</p>
            </CardContent>
          )}
        </Card>

        {/* Tags */}
        {lesson.content_data?.tags && Array.isArray(lesson.content_data.tags) && lesson.content_data.tags.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {lesson.content_data.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}


        {/* Content Display */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Content</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Video/Audio Content */}
            {lesson.type === "video_audio" && lesson.content_url && (
              <div className="w-full">
                {/* Check if it's a YouTube or Vimeo link */}
                {(lesson.content_url.includes('youtube.com') || 
                  lesson.content_url.includes('youtu.be') || 
                  lesson.content_url.includes('vimeo.com')) ? (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <iframe
                      src={
                        lesson.content_url.includes('youtube.com') 
                          ? lesson.content_url.replace('watch?v=', 'embed/')
                          : lesson.content_url.includes('youtu.be')
                          ? lesson.content_url.replace('youtu.be/', 'youtube.com/embed/')
                          : lesson.content_url.includes('vimeo.com')
                          ? lesson.content_url.replace('vimeo.com/', 'player.vimeo.com/video/')
                          : lesson.content_url
                      }
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={lesson.name}
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      src={lesson.content_url}
                      controls
                      className="w-full h-full"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}
              </div>
            )}

            {/* PDF Content */}
            {lesson.type === "pdf" && lesson.content_url && (
              <div className="w-full space-y-4">
                {/* Download button */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(lesson.content_url!, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View/Download PDF
                  </Button>
                </div>
                {/* PDF iframe embed using Google Docs Viewer */}
                <div className="w-full bg-gray-100 rounded-lg overflow-hidden border shadow-sm" style={{ height: '80vh', minHeight: '600px' }}>
                  <iframe
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(lesson.content_url)}&embedded=true`}
                    className="w-full h-full"
                    title={lesson.name}
                    style={{ border: 'none' }}
                  />
                </div>
              </div>
            )}

            {/* Text Content */}
            {lesson.type === "text" && lesson.content_data?.text_content && (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{lesson.content_data.text_content}</p>
              </div>
            )}

            {/* iFrame Content */}
            {lesson.type === "iframe" && lesson.content_url && (
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <iframe
                  src={lesson.content_url}
                  className="w-full h-full"
                  title="Embedded Content"
                  allowFullScreen
                />
              </div>
            )}

            {/* No content available */}
            {!lesson.content_url && !lesson.content_data?.text_content && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>No content available for this lesson.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="flex justify-start mt-6">
          <Button variant="outline" onClick={() => navigate("/training")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Course
          </Button>
        </div>
      </main>
    </div>
  );
}
