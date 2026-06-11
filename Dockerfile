FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY MyToggleService.sln ./
COPY MyToggleService.ApiService/MyToggleService.ApiService.csproj MyToggleService.ApiService/
COPY MyToggleService.ServiceDefaults/MyToggleService.ServiceDefaults.csproj MyToggleService.ServiceDefaults/

RUN dotnet restore MyToggleService.ApiService/MyToggleService.ApiService.csproj

COPY . .
WORKDIR /src/MyToggleService.ApiService
RUN dotnet publish MyToggleService.ApiService.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "MyToggleService.ApiService.dll"]
