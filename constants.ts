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

export const VOICES = [
    { value: 'Kore', label: 'Kore (Nữ, Dịu dàng)' },
    { value: 'Puck', label: 'Puck (Nam, Tự nhiên)' },
    { value: 'Charon', label: 'Charon (Nam, Trầm ấm)' },
    { value: 'Fenrir', label: 'Fenrir (Nam, Mạnh mẽ)' },
    { value: 'Zephyr', label: 'Zephyr (Nữ, Thanh thoát)' },
    { value: 'Aoede', label: 'Aoede (Nữ, Biểu cảm)' },
    { value: 'Leda', label: 'Leda (Nữ, Nhẹ nhàng)' },
    { value: 'Orus', label: 'Orus (Nam, Tự tin)' },
    { value: 'Alnilam', label: 'Alnilam (Nam, Sâu lắng)' },
    { value: 'Erinome', label: 'Erinome (Nữ, Trưởng thành)' },
] as const;

export const SPEED_OPTIONS = [
    { value: 0.75, label: '0.75x - Hơi chậm' },
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
