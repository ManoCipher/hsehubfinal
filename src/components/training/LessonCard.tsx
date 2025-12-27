import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Video,
  FileText,
  Type,
  Code,
  FolderOpen,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  CheckCircle2,
  Circle,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LessonCardProps {
  lesson: {
    id: string;
    course_id: string;
    name: string;
    type: "subchapter" | "video_audio" | "pdf" | "text" | "iframe";
    status: "draft" | "published";
    content_data?: any;
  };
  onDelete: (lessonId: string, lessonName: string) => void;
  onDuplicate: (lessonId: string) => void;
  onToggleStatus: (lessonId: string, currentStatus: string) => void;
}

export default function LessonCard({
  lesson,
  onDelete,
  onDuplicate,
  onToggleStatus,
}: LessonCardProps) {
  const navigate = useNavigate();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video_audio":
        return <Video className="w-5 h-5" />;
      case "pdf":
        return <FileText className="w-5 h-5" />;
      case "text":
        return <Type className="w-5 h-5" />;
      case "iframe":
        return <Code className="w-5 h-5" />;
      case "subchapter":
        return <FolderOpen className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
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

  const getTypeGradient = (type: string) => {
    switch (type) {
      case "video_audio":
        return "from-purple-500 to-pink-600";
      case "pdf":
        return "from-red-500 to-orange-600";
      case "text":
        return "from-blue-500 to-cyan-600";
      case "iframe":
        return "from-green-500 to-emerald-600";
      case "subchapter":
        return "from-yellow-500 to-amber-600";
      default:
        return "from-gray-500 to-slate-600";
    }
  };

  const handleEdit = () => {
    navigate(`/training/${lesson.course_id}/lesson/${lesson.id}`);
  };

  const handleView = () => {
    navigate(`/training/${lesson.course_id}/lesson/${lesson.id}/view`);
  };

  return (
    <Card className="p-4 hover:shadow-lg transition-all group">
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div
          className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getTypeGradient(
            lesson.type
          )} flex items-center justify-center text-white flex-shrink-0`}
        >
          {getTypeIcon(lesson.type)}
        </div>

        {/* Content - No longer clickable */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-base line-clamp-1">
              {lesson.name}
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {getTypeLabel(lesson.type)}
            </Badge>
            <Badge
              variant={lesson.status === "published" ? "default" : "secondary"}
              className="text-xs"
            >
              {lesson.status === "draft" ? (
                <>
                  <Circle className="w-3 h-3 mr-1" />
                  Draft
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Published
                </>
              )}
            </Badge>
          </div>

          {lesson.content_data?.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {lesson.content_data.description}
            </p>
          )}

          {/* See More Button */}
          <Button
            variant="link"
            size="sm"
            onClick={handleView}
            className="mt-2 p-0 h-auto text-primary hover:text-primary/80"
          >
            <Eye className="w-4 h-4 mr-1" />
            See More
          </Button>
        </div>

        {/* Settings Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(lesson.id)}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onToggleStatus(lesson.id, lesson.status)}
            >
              {lesson.status === "draft" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Publish
                </>
              ) : (
                <>
                  <Circle className="w-4 h-4 mr-2" />
                  Set as Draft
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(lesson.id, lesson.name)}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
