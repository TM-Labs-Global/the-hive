"use client"

import * as React from "react"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    SortingState,
    getSortedRowModel,
    ColumnFiltersState,
    getFilteredRowModel,
    VisibilityState,
} from "@tanstack/react-table"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { useEffect, useRef, useState, useMemo } from "react"

export interface RowConfig {
    label: string
    accessor: string
    cell?: (value: any, row: any) => React.ReactNode
}

interface DataTableProps<TData> {
    data: TData[]
    rows: RowConfig[]
    onClick?: (row: TData) => void
    searchable?: boolean
    pagination?: boolean
    pageSize?: number
    // External pagination props
    currentPage?: number
    totalPages?: number
    onPageChange?: (page: number) => void
    hasNextPage?: boolean
    hasPreviousPage?: boolean
    // Custom search props
    searchValue?: string
    onSearchChange?: (value: string) => void
    searchPlaceholder?: string
}

export function DataTable<TData extends Record<string, any>>({
    data,
    rows,
    onClick,
    searchable = false,
    pagination = true,
    pageSize = 10,
    currentPage,
    totalPages,
    onPageChange,
    hasNextPage,
    hasPreviousPage,
    searchValue,
    onSearchChange,
    searchPlaceholder = "Search...",
}: DataTableProps<TData>) {
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = useState({})
    const [globalFilter, setGlobalFilter] = useState("")
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Restore focus after data changes if search input has value (user was typing)
    useEffect(() => {
        const frameId = requestAnimationFrame(() => {
            const input = searchInputRef.current
            if (input && input.value && document.activeElement !== input) {
                input.focus()
                // Move cursor to end of input
                const len = input.value.length
                input.setSelectionRange(len, len)
            }
        })
        return () => cancelAnimationFrame(frameId)
    }, [data])

    // Determine if we're using external pagination
    const isExternalPagination = onPageChange !== undefined

    // Use external search if provided, otherwise use internal
    const isExternalSearch = onSearchChange !== undefined
    const currentSearchValue = isExternalSearch ? searchValue : globalFilter
    const handleSearchChange = isExternalSearch ? onSearchChange : setGlobalFilter

    // Convert row configs to TanStack Table columns
    const columns: ColumnDef<TData>[] = useMemo(
        () =>
            rows.map((row) => {
                const column: ColumnDef<TData> = {
                    accessorKey: row.accessor,
                    header: row.label,
                }

                if (row.cell) {
                    column.cell = ({ row: tableRow }) =>
                        row.cell!(tableRow.getValue(row.accessor), tableRow.original)
                }

                return column
            }),
        [rows]
    )

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: isExternalPagination ? undefined : (pagination ? getPaginationRowModel() : undefined),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: "includesString",
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter,
        },
        ...(isExternalPagination ? {} : {
            initialState: {
                pagination: {
                    pageSize,
                },
            },
        }),
    })

    return (
        <div className="space-y-4 w-full">
            {searchable && (
                <div className="flex items-center">
                    <Input
                        ref={searchInputRef}
                        placeholder={searchPlaceholder}
                        value={currentSearchValue ?? ""}
                        onChange={(event) => handleSearchChange?.(event.target.value)}
                        className="max-w-md"
                    />
                </div>
            )}

            <div className="w-full overflow-hidden rounded-md border bg-card">
                <div className="w-full overflow-x-auto">
                    <Table className="min-w-full">
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className="font-semibold whitespace-nowrap">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        onClick={() => onClick?.(row.original)}
                                        className={onClick ? "cursor-pointer" : ""}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="whitespace-nowrap">
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        No results found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {pagination && (
                <div className="flex items-center justify-between px-2">
                    <div className="flex-1 text-sm text-muted-foreground">
                        {table.getFilteredSelectedRowModel().rows.length > 0 && (
                            <span>
                                {table.getFilteredSelectedRowModel().rows.length} of{" "}
                                {table.getFilteredRowModel().rows.length} row(s) selected.
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-6 lg:space-x-8">
                        <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium">
                                Page {isExternalPagination ? currentPage : table.getState().pagination.pageIndex + 1} of{" "}
                                {isExternalPagination ? totalPages : table.getPageCount()}
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="secondary"
                                className="hidden h-8 w-8 p-0 lg:flex"
                                onClick={() => isExternalPagination ? onPageChange?.(1) : table.setPageIndex(0)}
                                disabled={isExternalPagination ? !hasPreviousPage : !table.getCanPreviousPage()}
                            >
                                <span className="sr-only">Go to first page</span>
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="secondary"
                                className="h-8 w-8 p-0"
                                onClick={() => isExternalPagination ? onPageChange?.((currentPage || 1) - 1) : table.previousPage()}
                                disabled={isExternalPagination ? !hasPreviousPage : !table.getCanPreviousPage()}
                            >
                                <span className="sr-only">Go to previous page</span>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="secondary"
                                className="h-8 w-8 p-0"
                                onClick={() => isExternalPagination ? onPageChange?.((currentPage || 1) + 1) : table.nextPage()}
                                disabled={isExternalPagination ? !hasNextPage : !table.getCanNextPage()}
                            >
                                <span className="sr-only">Go to next page</span>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="secondary"
                                className="hidden h-8 w-8 p-0 lg:flex"
                                onClick={() => isExternalPagination ? onPageChange?.(totalPages || 1) : table.setPageIndex(table.getPageCount() - 1)}
                                disabled={isExternalPagination ? !hasNextPage : !table.getCanNextPage()}
                            >
                                <span className="sr-only">Go to last page</span>
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}