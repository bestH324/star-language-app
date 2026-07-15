package com.xingyu.autism.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * 答卷提交请求
 */
public class AnswerSubmitRequest {

    @NotNull(message = "儿童ID不能为空")
    private Long childId;

    @NotNull(message = "问卷ID不能为空")
    private Long qid;

    @NotEmpty(message = "答案不能为空")
    private List<AnswerItem> answers;

    public Long getChildId() { return childId; }
    public void setChildId(Long childId) { this.childId = childId; }
    public Long getQid() { return qid; }
    public void setQid(Long qid) { this.qid = qid; }
    public List<AnswerItem> getAnswers() { return answers; }
    public void setAnswers(List<AnswerItem> answers) { this.answers = answers; }

    public static class AnswerItem {
        private Long questionId;
        private Integer value;   // 用户所选选项 value

        public Long getQuestionId() { return questionId; }
        public void setQuestionId(Long questionId) { this.questionId = questionId; }
        public Integer getValue() { return value; }
        public void setValue(Integer value) { this.value = value; }
    }
}
