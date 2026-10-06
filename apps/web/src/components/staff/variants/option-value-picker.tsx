"use client";

import { useCallback, useMemo, useState } from "react";
import MetaobjectSelect from "../metaobjects/metaobject-select";
import type { StaffMetaobjectEntry } from "../../../types/staff-metaobjects";

export interface OptionValuePickerProps {
  token: string;
  productId: string;
  optionName: string;
  existingValues: string[];
  disabled?: boolean;
  onPick: (entry: StaffMetaobjectEntry) => void;
  onPickText?: (text: string) => void;
}

function metaobjectTypeForOption(optionName: string): "color" | "entry" {
  return optionName.trim().toLowerCase() === "color" ? "color" : "entry";
}

export default function OptionValuePicker({
  token,
  optionName,
  existingValues: _existingValues,
  disabled = false,
  onPick,
  onPickText: _onPickText,
}: OptionValuePickerProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const type = useMemo(() => metaobjectTypeForOption(optionName), [optionName]);

  const handleChange = useCallback(
    (entries: StaffMetaobjectEntry[]) => {
      const newest = entries[entries.length - 1];
      if (newest) {
        onPick(newest);
      }
      setSelectedIds([]);
    },
    [onPick],
  );

  return (
    <MetaobjectSelect
      token={token}
      type={type}
      groupId={type === "color" ? undefined : optionName}
      searchPlaceholder={`Search or type ${optionName.toLowerCase()}`}
      placeholder={`Select or type ${optionName.toLowerCase()}`}
      value={selectedIds}
      multiple={false}
      disabled={disabled}
      onChange={handleChange}
    />
  );
}