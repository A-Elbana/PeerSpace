import React, { useState, useEffect } from 'react';
import { Users, GraduationCap, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ClassmateCard from './ClassmateCard';
import { useResolvedFileUrl } from '../../../hooks/useResolvedFileUrl';
import { Button } from '../../../components/ui/button';
import { communityApi } from '../../../services/api';

interface Member {
  id: number;
  fname: string;
  lname: string;
  avatar_file_id: string | null;
  role: string;
}

interface MembersPanelProps {
  communityId: string;
  currentUserId: number;
}

const INSTRUCTORS_PER_PAGE = 2;
const STUDENTS_PER_PAGE = 5;

const MembersPanel: React.FC<MembersPanelProps> = ({
  communityId,
  currentUserId,
}) => {
  const navigate = useNavigate();
  const [instructorPage, setInstructorPage] = useState(1);
  const [studentPage, setStudentPage] = useState(1);
  
  const [instructors, setInstructors] = useState<Member[]>([]);
  const [students, setStudents] = useState<Member[]>([]);
  const [instructorsLoading, setInstructorsLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [instructorTotal, setInstructorTotal] = useState(0);
  const [studentTotal, setStudentTotal] = useState(0);

  const InstructorItem: React.FC<{ instructor: Member }> = ({ instructor }) => {
    const avatarUrl = useResolvedFileUrl(instructor.avatar_file_id);

    return (
      <div className="flex items-center gap-3 py-2">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${instructor.fname} ${instructor.lname}`}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
        )}
        <span className="text-sm font-medium text-foreground">
          {instructor.fname} {instructor.lname}
        </span>
      </div>
    );
  };

  const handleViewProfile = (memberId: number) => {
    navigate(`/profile/${memberId}`);
  };

  // Fetch instructors when page changes
  useEffect(() => {
    const fetchInstructors = async () => {
      setInstructorsLoading(true);
      try {
        const response = await communityApi.getMembers(communityId, { limit: 100 });
        const allInstructors = response.data.instructors || [];
        setInstructorTotal(allInstructors.length);
        
        // Client-side pagination
        const start = (instructorPage - 1) * INSTRUCTORS_PER_PAGE;
        const end = start + INSTRUCTORS_PER_PAGE;
        setInstructors(allInstructors.slice(start, end));
      } catch (error) {
        console.error('Failed to fetch instructors:', error);
        setInstructors([]);
        setInstructorTotal(0);
      } finally {
        setInstructorsLoading(false);
      }
    };

    if (communityId) {
      fetchInstructors();
    }
  }, [communityId, instructorPage]);

  // Fetch students when page changes
  useEffect(() => {
    const fetchStudents = async () => {
      setStudentsLoading(true);
      try {
        const response = await communityApi.getMembers(communityId, { limit: 100 });
        const allStudents = response.data.students || [];
        setStudentTotal(allStudents.length);
        
        // Client-side pagination
        const start = (studentPage - 1) * STUDENTS_PER_PAGE;
        const end = start + STUDENTS_PER_PAGE;
        setStudents(allStudents.slice(start, end));
      } catch (error) {
        console.error('Failed to fetch students:', error);
        setStudents([]);
        setStudentTotal(0);
      } finally {
        setStudentsLoading(false);
      }
    };

    if (communityId) {
      fetchStudents();
    }
  }, [communityId, studentPage]);

  // Pagination calculations
  const instructorTotalPages = Math.ceil(instructorTotal / INSTRUCTORS_PER_PAGE);
  const studentTotalPages = Math.ceil(studentTotal / STUDENTS_PER_PAGE);

  if (instructorsLoading && instructorPage === 1 && studentsLoading && studentPage === 1) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-24 bg-muted rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="h-4 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-sm space-y-4">
      {/* Instructor Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Instructor</h3>
        </div>

        {instructors.length > 0 || instructorsLoading ? (
          <>
            <div className="space-y-2" style={{ minHeight: `${instructors.length > 0 ? instructors.length * 48 : 96}px` }}>
              {instructorsLoading ? (
                <div className="animate-pulse space-y-2">
                  {[...Array(INSTRUCTORS_PER_PAGE)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <div className="w-8 h-8 rounded-full bg-muted" />
                      <div className="h-4 w-24 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                instructors.map((instructor) => (
                  <InstructorItem key={instructor.id} instructor={instructor} />
                ))
              )}
            </div>
            
            {instructorTotalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInstructorPage(p => Math.max(1, p - 1))}
                  disabled={instructorPage === 1 || instructorsLoading}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {instructorPage} / {instructorTotalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInstructorPage(p => Math.min(instructorTotalPages, p + 1))}
                  disabled={instructorPage === instructorTotalPages || instructorsLoading}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No instructor assigned</p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Classmates Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Classmates</h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {studentTotal} member{studentTotal !== 1 ? 's' : ''}
          </span>
        </div>

        {students.length > 0 || studentsLoading ? (
          <>
            <div className="space-y-1" style={{ minHeight: `${students.length > 0 ? students.length * 56 : 280}px` }}>
              {studentsLoading ? (
                <div className="animate-pulse space-y-1">
                  {[...Array(STUDENTS_PER_PAGE)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <div className="w-8 h-8 rounded-full bg-muted" />
                      <div className="h-4 w-24 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                students.map((student) => (
                  <ClassmateCard
                    key={student.id}
                    member={student}
                    currentUserId={currentUserId}
                    onViewProfile={handleViewProfile}
                  />
                ))
              )}
            </div>

            {studentTotalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStudentPage(p => Math.max(1, p - 1))}
                  disabled={studentPage === 1 || studentsLoading}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {studentPage} / {studentTotalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStudentPage(p => Math.min(studentTotalPages, p + 1))}
                  disabled={studentPage === studentTotalPages || studentsLoading}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No classmates yet</p>
        )}
      </div>
    </div>
  );
};

export default MembersPanel;
