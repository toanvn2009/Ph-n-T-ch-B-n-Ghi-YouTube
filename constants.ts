// Shared constants for ScriptWriter and ResultDisplay

export const STYLES = [
    { value: 'Inspirational', label: 'Truyền cảm hứng (Kể chuyện đời thường)' },
    { value: 'Fairy Tale', label: 'Cổ tích / Ngụ ngôn' },
    { value: 'Thriller/Mystery', label: 'Trinh thám / Kịch tính' },
    { value: 'Sci-Fi', label: 'Khoa học viễn tưởng' },
    { value: 'Comedy', label: 'Hài hước / Châm biếm' },
    { value: 'Journalistic', label: 'Phóng sự / Tin tức' },
    { value: 'Cinematic', label: 'Điện ảnh (Mô tả cảnh quay)' },
    { value: 'Educational', label: 'Giáo dục / Giải thích (Explainer)' },
    { value: 'Review', label: 'Đánh giá / Review sản phẩm' },
    { value: 'Debate', label: 'Tranh luận / Phản biện' },
    { value: 'Vlog', label: 'Vlog / Tâm sự cá nhân' },
] as const;

export const TONES = [
    { value: 'Emotional', label: 'Cảm xúc / Sâu lắng' },
    { value: 'Enthusiastic', label: 'Hào hứng / Năng lượng cao' },
    { value: 'Serious', label: 'Nghiêm túc / Chuyên gia' },
    { value: 'Witty', label: 'Dí dỏm / Thông minh' },
    { value: 'Dark', label: 'U tối / Bí ẩn' },
    { value: 'Chill', label: 'Thư giãn / Nhẹ nhàng' },
    { value: 'Sarcastic', label: 'Mỉa mai / Châm chọc' },
    { value: 'Empathetic', label: 'Đồng cảm / Chia sẻ' },
    { value: 'Urgent', label: 'Khẩn cấp / Kêu gọi hành động' },
] as const;

export const PLOT_TWISTS = [
    { value: 'None', label: 'Không có (Tuyến tính)' },
    { value: 'Subtle Reversal', label: 'Đảo ngược nhẹ' },
    { value: 'Major Shock', label: 'Cú sốc lớn (Plot Twist)' },
    { value: 'Cliffhanger', label: 'Kết mở / Gay cấn' },
    { value: 'False Protagonist', label: 'Đổi vai chính bất ngờ' },
] as const;

export const ARCHETYPES = [
    { value: 'Narrator', label: 'Người dẫn chuyện (Khách quan)' },
    { value: 'The Hero', label: 'Người hùng (Vượt khó)' },
    { value: 'The Sage', label: 'Nhà hiền triết (Chia sẻ kiến thức)' },
    { value: 'The Rebel', label: 'Kẻ nổi loạn (Phá cách)' },
    { value: 'The Everyman', label: 'Người bình thường (Gần gũi)' },
    { value: 'The Jester', label: 'Chú hề (Vui vẻ/Hài hước)' },
    { value: 'The Explorer', label: 'Nhà thám hiểm (Khám phá)' },
] as const;

export const FOCUS_OPTIONS = [
    { value: 'Balanced', label: 'Cân bằng' },
    { value: 'Dialogue Heavy', label: 'Tập trung Đối thoại' },
    { value: 'Action Oriented', label: 'Tập trung Hành động' },
    { value: 'Descriptive', label: 'Tập trung Mô tả/Cảm xúc' },
    { value: 'Data Driven', label: 'Tập trung Số liệu/Sự kiện' },
] as const;

export const TARGET_AUDIENCES = [
    { value: 'General', label: 'Đại chúng (Mọi người)' },
    { value: 'Kids', label: 'Trẻ em (Dễ hiểu, vui nhộn)' },
    { value: 'Gen Z', label: 'Gen Z (Trẻ trung, bắt trend)' },
    { value: 'Professionals', label: 'Chuyên gia / Doanh nhân' },
    { value: 'Tech Savvy', label: 'Người yêu công nghệ' },
    { value: 'Seniors', label: 'Người lớn tuổi (Trang trọng)' },
] as const;

export const PACING_OPTIONS = [
    { value: 'Moderate', label: 'Vừa phải (Tiêu chuẩn)' },
    { value: 'Fast', label: 'Nhanh (Dồn dập, kịch tính)' },
    { value: 'Slow', label: 'Chậm rãi (Chiêm nghiệm, thư giãn)' },
    { value: 'Dynamic', label: 'Biến đổi (Lúc nhanh lúc chậm)' },
] as const;

// ── Voice Groups (shared with backend server/tts.ts) ──
export const VIETNAMESE_VOICES = [
    // Native Vietnamese
    { value: 'vi-VN-HoaiMyNeural', label: 'Hoài My (Nữ, Dịu dàng)', gender: 'Female', locale: 'vi-VN' },
    { value: 'vi-VN-NamMinhNeural', label: 'Nam Minh (Nam, Trầm ấm)', gender: 'Male', locale: 'vi-VN' },
    // Multilingual ổn định với tiếng Việt (đã test OK)
    { value: 'en-US-AndrewMultilingualNeural', label: 'Andrew (Nam, Tự tin) [ML OK]', gender: 'Male', locale: 'vi-VN' },
    { value: 'en-US-BrianMultilingualNeural', label: 'Brian (Nam, Điềm đạm) [ML OK]', gender: 'Male', locale: 'vi-VN' },
    { value: 'en-US-EmmaMultilingualNeural', label: 'Emma (Nữ, Biểu cảm) [ML OK]', gender: 'Female', locale: 'vi-VN' },
    { value: 'en-US-AvaMultilingualNeural', label: 'Ava (Nữ, Tự nhiên) [ML OK]', gender: 'Female', locale: 'vi-VN' },
] as const;

export const ENGLISH_VOICES = [
    { value: 'en-US-AriaNeural', label: 'Aria (Nữ, Đọc tin tức - EN) [News]', gender: 'Female', locale: 'en-US' },
    { value: 'en-US-GuyNeural', label: 'Guy (Nam, Kể chuyện lôi cuốn - EN) [YouTube][News]', gender: 'Male', locale: 'en-US' },
    { value: 'en-US-JennyNeural', label: 'Jenny (Nữ, Học tiếng Anh - EN) [Learning][YouTube]', gender: 'Female', locale: 'en-US' },
    { value: 'en-US-SteffanNeural', label: 'Steffan (Nam, Tâm tình Podcast - EN) [Podcast]', gender: 'Male', locale: 'en-US' },
    { value: 'en-US-ChristopherNeural', label: 'Christopher (Nam, Rõ ràng chuyên nghiệp - EN)', gender: 'Male', locale: 'en-US' },
    { value: 'en-US-EricNeural', label: 'Eric (Nam, Hiện đại năng động - EN)', gender: 'Male', locale: 'en-US' },
    { value: 'en-GB-RyanNeural', label: 'Ryan (Nam, Podcast UK - EN) [Podcast]', gender: 'Male', locale: 'en-GB' },
    { value: 'en-GB-LibbyNeural', label: 'Libby (Nữ, Podcast UK - EN) [Podcast]', gender: 'Female', locale: 'en-GB' },
    { value: 'en-GB-SoniaNeural', label: 'Sonia (Nữ, Học tiếng Anh UK - EN) [Learning]', gender: 'Female', locale: 'en-GB' },
] as const;

export const VOICES = [...VIETNAMESE_VOICES, ...ENGLISH_VOICES] as const;

export const SPEED_OPTIONS = [
    { value: 0.9, label: '0.9x - Chậm' },
    { value: 0.95, label: '0.95x - Hơi chậm' },
    { value: 1, label: '1x - Bình thường' },
    { value: 1.05, label: '1.05x - Hơi nhanh' },
    { value: 1.1, label: '1.1x - Nhanh' },
    { value: 1.15, label: '1.15x - Rất nhanh' },
] as const;

export const PAGINATION_THRESHOLD = 4;

// Derived label maps for ResultDisplay (eliminates duplicate definitions)
export const STYLE_LABELS: Record<string, string> = Object.fromEntries(
    STYLES.map(s => [s.value, s.label.split('(')[0].trim()])
);

export const TONE_LABELS: Record<string, string> = Object.fromEntries(
    TONES.map(t => [t.value, t.label.split('/')[0].trim()])
);
