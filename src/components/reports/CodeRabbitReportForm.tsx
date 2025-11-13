import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PROMPT_TEMPLATES = [
  'Select template',
  'Daily Standup Report',
  'Sprint Report',
  'Release Notes',
  'Custom',
] as const

const GROUP_BY_OPTIONS = [
  { value: 'NONE', label: 'None' },
  { value: 'REPOSITORY', label: 'Repository' },
  { value: 'USER', label: 'User' },
  { value: 'TEAM', label: 'Team' },
  { value: 'LABEL', label: 'Label' },
  { value: 'STATE', label: 'State' },
  { value: 'SOURCEBRANCH', label: 'Source Branch' },
  { value: 'TARGETBRANCH', label: 'Target Branch' },
] as const

const FILTER_PARAMETERS = [
  { value: 'REPOSITORY', label: 'Repository' },
  { value: 'LABEL', label: 'Label' },
  { value: 'TEAM', label: 'Team' },
  { value: 'USER', label: 'User' },
  { value: 'SOURCEBRANCH', label: 'Source Branch' },
  { value: 'TARGETBRANCH', label: 'Target Branch' },
  { value: 'STATE', label: 'State' },
] as const

const FILTER_OPERATORS = [
  { value: 'IN', label: 'In' },
  { value: 'ALL', label: 'All' },
  { value: 'NOT_IN', label: 'Not In' },
] as const

export interface FilterParameter {
  parameter: string
  operator: string
  values: string
}

export interface CodeRabbitReportFormData {
  promptTemplate: string
  customPrompt: string
  groupBy: string
  subgroupBy: string
  orgId: string
  filters: Array<FilterParameter>
}

interface CodeRabbitReportFormProps {
  value: CodeRabbitReportFormData
  onChange: (value: CodeRabbitReportFormData) => void
}

export function CodeRabbitReportForm({
  value,
  onChange,
}: CodeRabbitReportFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const addFilter = () => {
    onChange({
      ...value,
      filters: [
        ...value.filters,
        { parameter: 'REPOSITORY', operator: 'IN', values: '' },
      ],
    })
  }

  const removeFilter = (index: number) => {
    onChange({
      ...value,
      filters: value.filters.filter((_, i) => i !== index),
    })
  }

  const updateFilter = (
    index: number,
    field: keyof FilterParameter,
    newValue: string,
  ) => {
    const newFilters = [...value.filters]
    newFilters[index] = { ...newFilters[index], [field]: newValue }
    onChange({ ...value, filters: newFilters })
  }

  return (
    <div className="space-y-4">
      {/* Template Selection */}
      <div className="space-y-2.5">
        <Label htmlFor="template" className="text-sm font-semibold">
          Report Template
        </Label>
        <Select
          value={value.promptTemplate}
          onValueChange={(promptTemplate) =>
            onChange({ ...value, promptTemplate })
          }
        >
          <SelectTrigger id="template" className="h-11">
            <SelectValue>
              {value.promptTemplate || 'Select template'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PROMPT_TEMPLATES.map((template) => (
              <SelectItem
                key={template}
                value={template}
                disabled={template === 'Select template'}
              >
                {template}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom Prompt (shown only for Custom template) */}
      {value.promptTemplate === 'Custom' && (
        <div className="space-y-2">
          <Label htmlFor="prompt">Custom Prompt</Label>
          <Textarea
            id="prompt"
            value={value.customPrompt}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              onChange({ ...value, customPrompt: e.target.value })
            }
            placeholder="Describe what you want in the report..."
            rows={4}
            required
          />
        </div>
      )}

      {/* Advanced Options Toggle */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full h-11 font-medium"
      >
        {showAdvanced ? 'Hide' : 'Show'} Advanced Options
      </Button>

      {showAdvanced && (
        <div className="space-y-4 pt-5 border-t bg-muted/20 -mx-6 px-6 pb-1">
          {/* Extend to card edges */}
          {/* Group By */}
          <div className="space-y-2">
            <Label htmlFor="groupBy">Group By</Label>
            <Select
              value={value.groupBy}
              onValueChange={(groupBy) => onChange({ ...value, groupBy })}
            >
              <SelectTrigger id="groupBy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUP_BY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subgroup By */}
          <div className="space-y-2">
            <Label htmlFor="subgroupBy">Subgroup By (Optional)</Label>
            <Select
              value={value.subgroupBy}
              onValueChange={(subgroupBy) => onChange({ ...value, subgroupBy })}
            >
              <SelectTrigger id="subgroupBy">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {GROUP_BY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Organization ID */}
          <div className="space-y-2">
            <Label htmlFor="orgId">Organization ID (Optional)</Label>
            <Input
              id="orgId"
              value={value.orgId}
              onChange={(e) => onChange({ ...value, orgId: e.target.value })}
              placeholder="Enter organization ID"
            />
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Filters (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFilter}
                className="h-8"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Filter
              </Button>
            </div>

            {value.filters.map((filter, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr,1fr,2fr,auto] gap-3 items-end p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs">Parameter</Label>
                  <Select
                    value={filter.parameter}
                    onValueChange={(val) =>
                      updateFilter(index, 'parameter', val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILTER_PARAMETERS.map((param) => (
                        <SelectItem key={param.value} value={param.value}>
                          {param.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Operator</Label>
                  <Select
                    value={filter.operator}
                    onValueChange={(val) =>
                      updateFilter(index, 'operator', val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILTER_OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Values (pipe-separated)</Label>
                  <Input
                    value={filter.values}
                    onChange={(e) =>
                      updateFilter(index, 'values', e.target.value)
                    }
                    placeholder="value1 | value2"
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFilter(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {value.filters.length === 0 && (
              <div className="text-center py-6 px-4 border border-dashed rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground">
                  No filters added. Click "Add Filter" to narrow down the report
                  scope. Use pipe (|) to separate multiple values.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function getCodeRabbitReportPayload(data: CodeRabbitReportFormData) {
  const isCustomPrompt = data.promptTemplate === 'Custom'

  // Convert pipe-separated filter values to arrays
  const parameters =
    data.filters.length > 0
      ? data.filters
          .filter((f) => f.values.trim())
          .map((f) => ({
            parameter: f.parameter as
              | 'REPOSITORY'
              | 'LABEL'
              | 'TEAM'
              | 'USER'
              | 'SOURCEBRANCH'
              | 'TARGETBRANCH'
              | 'STATE',
            operator: f.operator as 'IN' | 'ALL' | 'NOT_IN',
            values: f.values.split('|').map((v) => v.trim()),
          }))
      : undefined

  return {
    promptTemplate: isCustomPrompt
      ? undefined
      : (data.promptTemplate as
          | 'Daily Standup Report'
          | 'Sprint Report'
          | 'Release Notes'),
    prompt: isCustomPrompt ? data.customPrompt : undefined,
    groupBy: data.groupBy as
      | 'NONE'
      | 'REPOSITORY'
      | 'LABEL'
      | 'TEAM'
      | 'USER'
      | 'SOURCEBRANCH'
      | 'TARGETBRANCH'
      | 'STATE',
    subgroupBy:
      data.subgroupBy && data.subgroupBy !== 'NONE'
        ? (data.subgroupBy as
            | 'NONE'
            | 'REPOSITORY'
            | 'LABEL'
            | 'TEAM'
            | 'USER'
            | 'SOURCEBRANCH'
            | 'TARGETBRANCH'
            | 'STATE')
        : undefined,
    orgId: data.orgId || undefined,
    parameters,
  }
}
