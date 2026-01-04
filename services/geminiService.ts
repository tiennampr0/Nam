import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GenerationConfig, ActionType, ReasoningMode, ContentLength } from '../types';
import { AUTHOR_PROMPTS, GENRE_PROMPTS, LENGTH_PROMPTS, SYSTEM_INSTRUCTION_BASE, DEEP_THINKING_PROMPT_ADDITION, REASONING_MODE_PROMPTS, PACING_PROMPTS } from '../constants';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateNovelContentStream = async (
  inputText: string,
  config: GenerationConfig,
  onChunk: (text: string) => void
): Promise<string> => {
  const ai = getClient();
  
  const styleInstruction = AUTHOR_PROMPTS[config.authorStyle];
  const genreInstruction = GENRE_PROMPTS[config.genre];
  const lengthInstruction = LENGTH_PROMPTS[config.length];
  const pacingInstruction = PACING_PROMPTS[config.pacing];
  
  // Gemini 3.0 Specific Reasoning Instruction
  const reasoningInstruction = config.model === 'gemini-3-pro-preview' 
    ? REASONING_MODE_PROMPTS[config.reasoningMode]
    : "";

  // Dynamic prompt construction based on action
  let actionGuidance = "";
  switch (config.action) {
    case ActionType.PLANNING:
      actionGuidance = `
      VAI TRÒ: TỔNG KIẾN TRÚC SƯ CỐT TRUYỆN (GRAND PLOT ARCHITECT)
      
      NHIỆM VỤ CẤP CAO: 
      Dựa trên dữ liệu đầu vào (cốt truyện sơ bộ, nhân vật, hệ thống), hãy XÂY DỰNG MỘT ĐẠI CƯƠNG HOÀN CHỈNH cho tác phẩm đồ sộ (quy mô 1000 - 5000 chương).
      
      QUY TRÌNH THỰC HIỆN:
      1. **Thẩm Định Logic (Logic Audit):** Phân tích dữ liệu đầu vào. Chỉ ra ngay các "Lỗ hổng logic" (Plot holes), sự mất cân bằng trong hệ thống sức mạnh, hoặc tính cách nhân vật mâu thuẫn. Đề xuất phương án sửa đổi để mạch truyện chặt chẽ.
      2. **Phân Chia Cấu Trúc (Macro Structure):** Chia tác phẩm thành các Quyển (Volumes) lớn (Ví dụ: Quyển 1: Nhân Giới Thiên, Quyển 2: Linh Giới Thiên...). Mỗi Quyển cần có chủ đề rõ ràng và "Trùm cuối" (Main Antagonist) của giai đoạn đó.
      3. **Chi Tiết Hóa Giai Đoạn Đầu (Micro Structure):** Lên danh sách tên chương và tóm tắt nội dung cho 50-100 chương đầu tiên (hoặc Quyển 1).
         - Tên chương phải đậm chất Tiên Hiệp/Dã Sử (Hán Việt, 4 chữ hoặc đối xứng). Ví dụ: "Nguyệt Dạ Sát Nhân", "Huyết Nhiễm Thanh Thiên".
         - Nội dung phải có tính liên kết: Gieo nhân (Foreshadowing) -> Gặt quả (Payoff).
      4. **Cao Trào & Nút Thắt (Plot Twists):** Thiết kế các điểm bùng nổ cảm xúc. Đâu là lúc nhân vật chính gặp tuyệt vọng nhất? Đâu là lúc "Nghịch thiên cải mệnh"?

      YÊU CẦU ĐẦU RA:
      - Trình bày mạch lạc, sử dụng các đầu mục (Bullet points).
      - Giọng văn: Khách quan, phân tích, nhưng khi mô tả tên chương phải dùng từ ngữ "Bá khí", "Huyền bí".
      `;
      break;
    case ActionType.REWRITE:
      actionGuidance = "NHUẬN SẮC: Viết lại đoạn văn trên thành một tác phẩm văn học hoàn chỉnh. Giữ nguyên cốt truyện cốt lõi nhưng nâng cấp toàn diện về từ ngữ, cấu trúc câu, và miêu tả.";
      break;
    case ActionType.EXPAND:
      actionGuidance = "PHÁT TRIỂN: Từ ý tưởng/dàn ý này, hãy viết thành một chương truyện hoặc trường đoạn đầy đủ. Thêm thoại, miêu tả nội tâm, hành động chi tiết.";
      break;
    case ActionType.SCENE_CRAFTING:
      actionGuidance = "DỰNG CẢNH: Tập trung tuyệt đối vào việc miêu tả không gian, thời gian, không khí. Sử dụng kỹ thuật 'Tả cảnh ngụ tình'.";
      break;
    case ActionType.CRITIQUE:
      actionGuidance = "PHÊ BÌNH & GÓP Ý: Phân tích điểm mạnh/yếu, sau đó viết lại đoạn mẫu đã sửa lỗi.";
      break;
    default:
      actionGuidance = "Xử lý văn bản một cách sáng tạo và chuyên nghiệp.";
  }

  // Logic to strictly enforce length for long content
  // Note: For PLANNING mode, lengthInstruction applies to the DEPTH of the outline, not necessarily word count of a scene.
  const isLongContent = [ContentLength.LONG, ContentLength.VERY_LONG, ContentLength.EPIC].includes(config.length);
  const strictLengthInstruction = (isLongContent && config.action !== ActionType.PLANNING) ? `
    *** CẢNH BÁO VỀ ĐỘ DÀI (CRITICAL LENGTH WARNING) ***
    Người dùng ĐẶC BIỆT YÊU CẦU độ dài tối thiểu là ${lengthInstruction.split('(')[1]?.split(')')[0] || "RẤT DÀI"}.
    Hiện tại AI thường viết quá ngắn. ĐÂY LÀ LỖI NGHIÊM TRỌNG CẦN TRÁNH.
    
    CHIẾN THUẬT ĐỂ ĐẠT ĐỘ DÀI NÀY (BẮT BUỘC ÁP DỤNG):
    1. **Viết chậm (Slow Pacing):** Đừng cho nhân vật đi từ A đến B trong 1 câu. Hãy miêu tả từng bước chân, tiếng động xung quanh, suy nghĩ trong đầu họ.
    2. **Phóng đại chi tiết (Micro-details):** Thay vì "Hắn uống trà", hãy viết 200 chữ về việc hắn nâng chén, hương trà, độ nóng, và cảm giác khi trà trôi qua cổ họng.
    3. **Hồi tưởng & Nội tâm:** Nhân vật nghĩ gì về quá khứ? Về tương lai? Về kẻ thù?
    4. **Môi trường:** Ánh sáng, gió, mùi vị, không khí ảnh hưởng thế nào đến cảnh vật?
    
    NẾU INPUT CỦA TÔI QUÁ NGẮN: Hãy coi đó chỉ là "Hạt Giống". Nhiệm vụ của bạn là trồng nó thành "Cây Cổ Thụ". Đừng chỉ viết lại input, hãy SÁNG TẠO THÊM vô số tình tiết phụ liên quan để đạt đủ số chữ. ĐỪNG DỪNG LẠI CHO ĐẾN KHI ĐỦ DUNG LƯỢNG.
` : "";

  const userPrompt = `
    === THÔNG SỐ KỸ THUẬT ===
    - Thể loại: ${genreInstruction}
    - Phong cách mô phỏng: ${styleInstruction}
    - Yêu cầu độ dài/Chi tiết: ${lengthInstruction}
    - Nhịp độ: ${pacingInstruction}
    ${reasoningInstruction ? `- Chế độ ưu tiên: ${reasoningInstruction}` : ''}
    
    ${config.worldSettings ? `=== THIẾT LẬP THẾ GIỚI / QUY TẮC (WORLD SETTINGS) ===\nĐây là các quy tắc bất di bất dịch của thế giới này (Cấp bậc tu luyện, Địa danh, Chức quan, Hệ thống sức mạnh). BẠN BẮT BUỘC PHẢI TUÂN THỦ, KHÔNG ĐƯỢC VIẾT SAI LỆCH:\n"${config.worldSettings}"\n` : ''}

    ${config.outline ? `=== ĐẠI CƯƠNG / DÀN Ý CỐT TRUYỆN (OUTLINE) ===\nĐây là tóm tắt toàn bộ cốt truyện hoặc định hướng phát triển dài hạn. Hãy bám sát sườn ý này để triển khai nội dung, đảm bảo không bị lạc đề:\n"${config.outline}"\n` : ''}

    ${config.previousEnding ? `=== ĐOẠN KẾT CHƯƠNG TRƯỚC (LAST PART OF PREVIOUS CHAPTER) ===\nĐây là đoạn văn cuối cùng của chương trước. Nhiệm vụ của bạn là VIẾT TIẾP mạch truyện từ điểm này một cách liền mạch (Seamless continuation), khớp nối hoàn hảo về thời gian, không gian và cảm xúc nhân vật:\n"${config.previousEnding}"\n` : ''}

    === YÊU CẦU NHIỆM VỤ ===
    ${actionGuidance}
    
    === DỮ LIỆU ĐẦU VÀO ===
    "${inputText}"
    
    ${strictLengthInstruction}

    === LỆNH THỰC THI (QUAN TRỌNG) ===
    1. BẮT BUỘC: Không được in ra bất kỳ lời chào hỏi, mở bài hay kết luận nào (trừ khi đang ở chế độ Kiến Trúc Đại Cương thì cần có tiêu đề rõ ràng).
    2. Bắt đầu viết ngay vào nội dung chính.
    3. ƯU TIÊN TUYỆT ĐỐI TỪ HÁN VIỆT: Sử dụng từ ngữ trang trọng, cổ kính (Vẫn lạc, Ngưng thị, Oanh kích...).
    4. LOGIC: Nhân vật không được hành động ngu ngốc trái với thiết lập.
    5. KHÔNG MARKDOWN: Không dùng dấu * để định dạng. Trả về văn bản thuần (trừ chế độ Kiến Trúc Đại Cương có thể dùng Markdown cho các đề mục).
  `;

  // Logic selection based on available models
  const modelName = config.model;
  const isThinkingSupported = modelName.includes('gemini-2.5');
  
  // Calculate temperature based on reasoning mode for Gemini 3.0
  let temperature = config.creativity;
  if (modelName === 'gemini-3-pro-preview') {
    if (config.reasoningMode === ReasoningMode.LOGIC) temperature = 0.3; // Low temp for logic
    else if (config.reasoningMode === ReasoningMode.CREATIVE) temperature = 0.95; // High temp for creativity
    else temperature = 0.7; // Balanced
  }

  const requestConfig: any = {
    systemInstruction: SYSTEM_INSTRUCTION_BASE + (config.useDeepThinking && isThinkingSupported ? DEEP_THINKING_PROMPT_ADDITION : ""),
    temperature: temperature,
  };

  // Only apply thinking budget if supported (Gemini 2.5) and enabled
  if (config.useDeepThinking && isThinkingSupported) {
    requestConfig.thinkingConfig = { thinkingBudget: config.thinkingBudget || 4096 };
  }

  try {
    const responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents: userPrompt,
      config: requestConfig
    });

    let fullText = '';
    for await (const chunk of responseStream) {
      const chunkText = (chunk as GenerateContentResponse).text;
      if (chunkText) {
        fullText += chunkText;
        onChunk(chunkText);
      }
    }
    return fullText;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes('429')) {
      throw new Error("Hệ thống đang quá tải do nhu cầu sáng tác cao. Vui lòng thử lại sau giây lát.");
    }
    throw new Error(error.message || "Đã xảy ra lỗi kết nối với trí tuệ nhân tạo.");
  }
};