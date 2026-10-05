<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTakedownRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'public_id'   => ['required', 'string', 'max:20'],
            'reason_code' => ['required', 'in:privacy,personal_data,harassment,defamation,sender_request,subject_request,wrong_submission,other'],
            'reason_text' => ['required', 'string', 'min:10', 'max:2000'],
            'contact'     => ['nullable', 'string', 'max:200'],
        ];
    }

    public function messages(): array
    {
        return [
            'public_id.required'   => 'ID publik wajib diisi.',
            'reason_code.required' => 'Pilih alasan takedown.',
            'reason_code.in'       => 'Alasan tidak valid.',
            'reason_text.required' => 'Penjelasan wajib diisi.',
            'reason_text.min'      => 'Penjelasan terlalu singkat (minimal 10 karakter).',
        ];
    }
}
